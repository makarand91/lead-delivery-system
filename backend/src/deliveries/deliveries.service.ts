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
  private readonly leadFilesBucket: string;

  constructor(
    private awsClients: AwsClientsService,
    private excelParser: ExcelParserService,
    private configService: ConfigService,
  ) {
    this.deliveriesTable = this.configService.get('DELIVERIES_TABLE');
    this.leadFilesBucket = this.configService.get('LEAD_FILES_BUCKET');
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

  async getUploadUrl(filename: string, customerId: string): Promise<{ uploadUrl: string; s3Key: string }> {
    const s3Key = `customers/${customerId}/leads/${Date.now()}-${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.leadFilesBucket,
      Key: s3Key,
      ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const uploadUrl = await getSignedUrl(this.awsClients.s3Client, command, {
      expiresIn: 3600, // 1 hour
    });

    return { uploadUrl, s3Key };
  }
}
