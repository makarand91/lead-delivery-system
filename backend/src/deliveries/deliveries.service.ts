import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AwsClientsService } from '../common/aws-clients.service';
import { ExcelParserService } from '../excel-parser/excel-parser.service';
import { v4 as uuidv4 } from 'uuid';

export interface Delivery {
  deliveryId: string;
  customerId: string;
  s3FileKey: string;
  mappingId?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  totalLeads: number;
  successCount: number;
  failedCount: number;
  scheduledAt: string;
  processedAt?: string;
  createdAt: string;
  createdBy: string;
}

@Injectable()
export class DeliveriesService {
  private readonly deliveriesTable: string;
  private readonly s3Bucket: string;
  private readonly leadFilesPrefix: string;

  constructor(
    private awsClients: AwsClientsService,
    private excelParser: ExcelParserService,
    private configService: ConfigService,
  ) {
    this.deliveriesTable = this.configService.get('DELIVERIES_TABLE');
    // Support both unified bucket and legacy separate bucket approaches
    this.s3Bucket = this.configService.get('S3_BUCKET') || this.configService.get('LEAD_FILES_BUCKET');
    this.leadFilesPrefix = this.configService.get('LEAD_FILES_PREFIX') || '';
  }

  async create(data: Partial<Delivery>): Promise<Delivery> {
    const deliveryId = uuidv4();
    const now = new Date().toISOString();

    const delivery: Delivery = {
      deliveryId,
      customerId: data.customerId,
      s3FileKey: data.s3FileKey,
      mappingId: data.mappingId,
      status: 'PENDING',
      totalLeads: 0,
      successCount: 0,
      failedCount: 0,
      scheduledAt: data.scheduledAt || now,
      createdAt: now,
      createdBy: data.createdBy,
    };

    // Parse Excel to get total leads
    try {
      const parsedData = await this.excelParser.parseExcelFromS3(delivery.s3FileKey);
      delivery.totalLeads = parsedData.totalRows;
    } catch (error) {
      console.error('Error parsing Excel file:', error);
    }

    await this.awsClients.dynamoClient.send(
      new PutCommand({
        TableName: this.deliveriesTable,
        Item: {
          PK: `DELIVERY#${deliveryId}`,
          SK: 'METADATA',
          customerId: delivery.customerId,
          status: delivery.status,
          scheduledAt: delivery.scheduledAt,
          ...delivery,
        },
      }),
    );

    return delivery;
  }

  async findOne(deliveryId: string): Promise<Delivery> {
    const result = await this.awsClients.dynamoClient.send(
      new GetCommand({
        TableName: this.deliveriesTable,
        Key: {
          PK: `DELIVERY#${deliveryId}`,
          SK: 'METADATA',
        },
      }),
    );

    if (!result.Item) {
      throw new NotFoundException(`Delivery ${deliveryId} not found`);
    }

    return result.Item as Delivery;
  }

  async findByCustomer(customerId: string): Promise<Delivery[]> {
    const result = await this.awsClients.dynamoClient.send(
      new QueryCommand({
        TableName: this.deliveriesTable,
        IndexName: 'CustomerIndex',
        KeyConditionExpression: 'customerId = :customerId',
        ExpressionAttributeValues: {
          ':customerId': customerId,
        },
        ScanIndexForward: false, // Most recent first
      }),
    );

    return (result.Items || []) as Delivery[];
  }

  async findByStatus(status: string): Promise<Delivery[]> {
    const result = await this.awsClients.dynamoClient.send(
      new QueryCommand({
        TableName: this.deliveriesTable,
        IndexName: 'StatusIndex',
        KeyConditionExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': status,
        },
      }),
    );

    return (result.Items || []) as Delivery[];
  }

  async findAll(limit: number = 100, lastEvaluatedKey?: any): Promise<{
    deliveries: Delivery[];
    lastEvaluatedKey?: any
  }> {
    const result = await this.awsClients.dynamoClient.send(
      new QueryCommand({
        TableName: this.deliveriesTable,
        IndexName: 'StatusIndex',
        KeyConditionExpression: '#status = :pending OR #status = :processing OR #status = :completed OR #status = :failed',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':pending': 'PENDING',
          ':processing': 'PROCESSING',
          ':completed': 'COMPLETED',
          ':failed': 'FAILED',
        },
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
        ScanIndexForward: false, // Most recent first
      }),
    );

    return {
      deliveries: (result.Items || []) as Delivery[],
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  }

  async getGlobalDeliveriesView(filters?: {
    status?: string;
    customerId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<{
    deliveries: Delivery[];
    summary: {
      total: number;
      pending: number;
      processing: number;
      completed: number;
      failed: number;
      totalLeads: number;
      successfulLeads: number;
      failedLeads: number;
    };
  }> {
    // Get all deliveries (with pagination if needed)
    const { deliveries } = await this.findAll(filters?.limit || 1000);

    // Apply filters
    let filteredDeliveries = deliveries;

    if (filters?.status) {
      filteredDeliveries = filteredDeliveries.filter(d => d.status === filters.status);
    }

    if (filters?.customerId) {
      filteredDeliveries = filteredDeliveries.filter(d => d.customerId === filters.customerId);
    }

    if (filters?.startDate) {
      filteredDeliveries = filteredDeliveries.filter(d => d.createdAt >= filters.startDate);
    }

    if (filters?.endDate) {
      filteredDeliveries = filteredDeliveries.filter(d => d.createdAt <= filters.endDate);
    }

    // Calculate summary
    const summary = {
      total: filteredDeliveries.length,
      pending: filteredDeliveries.filter(d => d.status === 'PENDING').length,
      processing: filteredDeliveries.filter(d => d.status === 'PROCESSING').length,
      completed: filteredDeliveries.filter(d => d.status === 'COMPLETED').length,
      failed: filteredDeliveries.filter(d => d.status === 'FAILED').length,
      totalLeads: filteredDeliveries.reduce((sum, d) => sum + d.totalLeads, 0),
      successfulLeads: filteredDeliveries.reduce((sum, d) => sum + d.successCount, 0),
      failedLeads: filteredDeliveries.reduce((sum, d) => sum + d.failedCount, 0),
    };

    return {
      deliveries: filteredDeliveries,
      summary,
    };
  }

  async updateStatus(
    deliveryId: string,
    status: Delivery['status'],
    counts?: { successCount?: number; failedCount?: number },
  ): Promise<void> {
    const updateExpressions: string[] = ['#status = :status'];
    const expressionAttributeNames: Record<string, string> = {
      '#status': 'status',
    };
    const expressionAttributeValues: Record<string, any> = {
      ':status': status,
    };

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

    await this.awsClients.dynamoClient.send(
      new UpdateCommand({
        TableName: this.deliveriesTable,
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

  async uploadFileToS3(fileBuffer: Buffer, filename: string, customerId: string): Promise<string> {
    const s3Key = `${this.leadFilesPrefix}customers/${customerId}/leads/${Date.now()}-${filename}`;

    await this.awsClients.s3Client.send(
      new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );

    return s3Key;
  }

  async getExcelHeaders(s3Key: string): Promise<string[]> {
    try {
      const parsedData = await this.excelParser.parseExcelFromS3(s3Key);
      return parsedData.headers;
    } catch (error) {
      console.error('Error parsing Excel headers:', error);
      return [];
    }
  }

  // Legacy method - kept for backward compatibility but not recommended
  async getUploadUrl(filename: string, customerId: string): Promise<{ uploadUrl: string; s3Key: string }> {
    const s3Key = `${this.leadFilesPrefix}customers/${customerId}/leads/${Date.now()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.s3Bucket,
      Key: s3Key,
      ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const uploadUrl = await getSignedUrl(this.awsClients.s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    return { uploadUrl, s3Key };
  }
}
