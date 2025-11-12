import { Handler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import * as XLSX from 'xlsx';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const lambdaClient = new LambdaClient({});
const s3Client = new S3Client({});

const DELIVERIES_TABLE = process.env.DELIVERIES_TABLE!;
const CUSTOMERS_TABLE = process.env.CUSTOMERS_TABLE!;
const FIELD_MAPPINGS_TABLE = process.env.FIELD_MAPPINGS_TABLE!;
const DELIVERY_LOGS_TABLE = process.env.DELIVERY_LOGS_TABLE!;
const LEAD_FILES_BUCKET = process.env.LEAD_FILES_BUCKET!;
const CONCURRENT_DELIVERIES = parseInt(process.env.CONCURRENT_DELIVERIES || '10');

interface Delivery {
  deliveryId: string;
  customerId: string;
  s3FileKey: string;
  mappingId?: string;
  status: string;
  scheduledAt: string;
}

interface Customer {
  customerId: string;
  lambdaArn: string;
  credentials: any;
  customContext: any;
}

interface FieldMapping {
  fieldMappings: Array<{
    sourceField: string;
    targetField: string;
    transformation?: string;
    transformationParams?: any;
  }>;
}

export const handler: Handler = async (event) => {
  console.log('Batch processor started', { event });

  try {
    // Find pending deliveries that are scheduled to run now
    const pendingDeliveries = await findPendingDeliveries();
    console.log(`Found ${pendingDeliveries.length} pending deliveries`);

    if (pendingDeliveries.length === 0) {
      return { message: 'No pending deliveries to process' };
    }

    // Process deliveries concurrently (up to limit)
    const results = await processDeliveriesInBatches(
      pendingDeliveries,
      CONCURRENT_DELIVERIES,
    );

    console.log('Batch processing completed', {
      total: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
    });

    return {
      message: 'Batch processing completed',
      results,
    };
  } catch (error) {
    console.error('Batch processor error:', error);
    throw error;
  }
};

async function findPendingDeliveries(): Promise<Delivery[]> {
  const now = new Date().toISOString();

  const result = await dynamoClient.send(
    new QueryCommand({
      TableName: DELIVERIES_TABLE,
      IndexName: 'StatusIndex',
      KeyConditionExpression: '#status = :status AND scheduledAt <= :now',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'PENDING',
        ':now': now,
      },
      Limit: CONCURRENT_DELIVERIES,
    }),
  );

  return (result.Items || []) as Delivery[];
}

async function processDeliveriesInBatches(
  deliveries: Delivery[],
  batchSize: number,
): Promise<any[]> {
  const results: any[] = [];

  for (let i = 0; i < deliveries.length; i += batchSize) {
    const batch = deliveries.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(delivery => processDelivery(delivery)),
    );

    results.push(
      ...batchResults.map((result, index) => ({
        deliveryId: batch[index].deliveryId,
        status: result.status,
        value: result.status === 'fulfilled' ? result.value : undefined,
        error: result.status === 'rejected' ? result.reason : undefined,
      })),
    );
  }

  return results;
}

async function processDelivery(delivery: Delivery): Promise<any> {
  console.log(`Processing delivery ${delivery.deliveryId}`);

  try {
    // Update status to PROCESSING
    await updateDeliveryStatus(delivery.deliveryId, 'PROCESSING');

    // Get customer details
    const customer = await getCustomer(delivery.customerId);
    if (!customer.lambdaArn) {
      throw new Error('Customer Lambda ARN not configured');
    }

    // Get field mappings
    const mappings = delivery.mappingId
      ? await getFieldMappings(delivery.customerId, delivery.mappingId)
      : null;

    // Parse Excel file
    const leads = await parseLeadsFromS3(delivery.s3FileKey);
    console.log(`Parsed ${leads.length} leads from file`);

    // Invoke customer Lambda with leads
    const result = await invokeCustomerLambda(customer.lambdaArn, {
      leads,
      fieldMappings: mappings?.fieldMappings || [],
      credentials: customer.credentials,
      customContext: customer.customContext,
    });

    // Save logs
    await saveDeliveryLogs(delivery.deliveryId, result.results || []);

    // Update delivery status
    const successCount = result.results.filter((r: any) => r.status === 'SUCCESS').length;
    const failedCount = result.results.filter((r: any) => r.status === 'FAILED').length;

    await updateDeliveryStatus(
      delivery.deliveryId,
      failedCount === 0 ? 'COMPLETED' : 'FAILED',
      { successCount, failedCount },
    );

    console.log(`Delivery ${delivery.deliveryId} completed`, { successCount, failedCount });

    return {
      deliveryId: delivery.deliveryId,
      successCount,
      failedCount,
    };
  } catch (error) {
    console.error(`Error processing delivery ${delivery.deliveryId}:`, error);
    await updateDeliveryStatus(delivery.deliveryId, 'FAILED');
    throw error;
  }
}

async function getCustomer(customerId: string): Promise<Customer> {
  const result = await dynamoClient.send(
    new GetCommand({
      TableName: CUSTOMERS_TABLE,
      Key: {
        PK: `CUSTOMER#${customerId}`,
        SK: 'METADATA',
      },
    }),
  );

  if (!result.Item) {
    throw new Error(`Customer ${customerId} not found`);
  }

  return result.Item as Customer;
}

async function getFieldMappings(customerId: string, mappingId: string): Promise<FieldMapping> {
  const result = await dynamoClient.send(
    new GetCommand({
      TableName: FIELD_MAPPINGS_TABLE,
      Key: {
        PK: `CUSTOMER#${customerId}`,
        SK: `MAPPING#${mappingId}`,
      },
    }),
  );

  if (!result.Item) {
    throw new Error(`Mapping ${mappingId} not found`);
  }

  return result.Item as FieldMapping;
}

async function parseLeadsFromS3(s3Key: string): Promise<any[]> {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: LEAD_FILES_BUCKET,
      Key: s3Key,
    }),
  );

  const buffer = await streamToBuffer(response.Body);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
  });

  if (jsonData.length === 0) {
    return [];
  }

  const headers = jsonData[0] as string[];
  const rows = jsonData.slice(1).map((row: any[]) => {
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });

  return rows;
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on('data', (chunk: any) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

async function invokeCustomerLambda(lambdaArn: string, payload: any): Promise<any> {
  const result = await lambdaClient.send(
    new InvokeCommand({
      FunctionName: lambdaArn,
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify(payload),
    }),
  );

  if (result.FunctionError) {
    throw new Error(`Lambda invocation failed: ${result.FunctionError}`);
  }

  const responsePayload = JSON.parse(new TextDecoder().decode(result.Payload));
  return responsePayload;
}

async function saveDeliveryLogs(deliveryId: string, results: any[]): Promise<void> {
  const ttl = Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60; // 90 days

  await Promise.all(
    results.map((result, index) =>
      dynamoClient.send(
        new PutCommand({
          TableName: DELIVERY_LOGS_TABLE,
          Item: {
            PK: `DELIVERY#${deliveryId}`,
            SK: `LEAD#${result.leadIndex || index}`,
            deliveryId,
            leadIndex: result.leadIndex || index,
            status: result.status,
            errorMessage: result.error,
            crmId: result.crmId,
            retryCount: 0,
            processedAt: new Date().toISOString(),
            ttl,
          },
        }),
      ),
    ),
  );
}

async function updateDeliveryStatus(
  deliveryId: string,
  status: string,
  counts?: { successCount?: number; failedCount?: number },
): Promise<void> {
  const updateExpressions: string[] = ['#status = :status'];
  const expressionAttributeNames: Record<string, string> = { '#status': 'status' };
  const expressionAttributeValues: Record<string, any> = { ':status': status };

  if (counts?.successCount !== undefined) {
    updateExpressions.push('successCount = :successCount');
    expressionAttributeValues[':successCount'] = counts.successCount;
  }

  if (counts?.failedCount !== undefined) {
    updateExpressions.push('failedCount = :failedCount');
    expressionAttributeValues[':failedCount'] = counts.failedCount;
  }

  if (status === 'COMPLETED' || status === 'FAILED') {
    updateExpressions.push('processedAt = :processedAt');
    expressionAttributeValues[':processedAt'] = new Date().toISOString();
  }

  await dynamoClient.send(
    new UpdateCommand({
      TableName: DELIVERIES_TABLE,
      Key: {
        PK: `DELIVERY#${deliveryId}`,
        SK: 'METADATA',
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }),
  );
}
