import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutCommand, GetCommand, QueryCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
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
  fieldMappings?: Array<{ sourceField: string; targetField: string; required?: boolean }>;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  totalLeads: number;
  successCount: number;
  failedCount: number;
  scheduledAt: string;
  processedAt?: string;
  createdAt: string;
  createdBy: string;
  uploadedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  warehouseS3Key?: string;
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
      fieldMappings: data.fieldMappings,
      status: 'PENDING_APPROVAL',
      approvalStatus: 'PENDING',
      totalLeads: 0,
      successCount: 0,
      failedCount: 0,
      scheduledAt: data.scheduledAt || now,
      createdAt: now,
      createdBy: data.createdBy,
      uploadedBy: data.createdBy, // Same as createdBy for now
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
          approvalStatus: delivery.approvalStatus,
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
      new ScanCommand({
        TableName: this.deliveriesTable,
        FilterExpression: 'begins_with(PK, :pkPrefix)',
        ExpressionAttributeValues: {
          ':pkPrefix': 'DELIVERY#',
        },
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    // Sort by createdAt descending (most recent first)
    const deliveries = (result.Items || []) as Delivery[];
    deliveries.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    return {
      deliveries,
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

  // Preview formatted data with mappings applied
  async getPreviewData(deliveryId: string, limit: number = 50): Promise<{
    headers: string[];
    rows: any[];
    totalRows: number;
    mappings: Array<{ sourceField: string; targetField: string; required?: boolean }>;
  }> {
    const delivery = await this.findOne(deliveryId);

    // Parse Excel file
    const parsedData = await this.excelParser.parseExcelFromS3(delivery.s3FileKey);

    // Apply field mappings if present
    let formattedRows = parsedData.rows.slice(0, limit);
    const mappings = delivery.fieldMappings || [];

    if (mappings.length > 0) {
      formattedRows = formattedRows.map(row => {
        const formattedRow: any = {};
        mappings.forEach(mapping => {
          if (mapping.targetField !== 'unmapped') {
            formattedRow[mapping.targetField] = row[mapping.sourceField] || '';
          }
        });
        // Add unmapped fields at the end
        mappings
          .filter(m => m.targetField === 'unmapped')
          .forEach(mapping => {
            formattedRow[mapping.sourceField] = row[mapping.sourceField] || '';
          });
        return formattedRow;
      });
    }

    return {
      headers: mappings.length > 0
        ? mappings.filter(m => m.targetField !== 'unmapped').map(m => m.targetField)
        : parsedData.headers,
      rows: formattedRows,
      totalRows: parsedData.totalRows,
      mappings,
    };
  }

  // Approve delivery and create formatted file in warehouse
  async approveDelivery(deliveryId: string, approvedBy: string): Promise<Delivery> {
    const delivery = await this.findOne(deliveryId);

    if (delivery.approvalStatus === 'APPROVED') {
      throw new Error('Delivery is already approved');
    }

    // Format full data and save to warehouse
    const warehouseS3Key = await this.formatAndSaveToWarehouse(delivery);

    // Update delivery status
    const now = new Date().toISOString();
    const updatedDelivery: Delivery = {
      ...delivery,
      status: 'PENDING',
      approvalStatus: 'APPROVED',
      approvedBy,
      approvedAt: now,
      warehouseS3Key,
    };

    await this.awsClients.dynamoClient.send(
      new PutCommand({
        TableName: this.deliveriesTable,
        Item: {
          PK: `DELIVERY#${deliveryId}`,
          SK: 'METADATA',
          customerId: updatedDelivery.customerId,
          status: updatedDelivery.status,
          approvalStatus: updatedDelivery.approvalStatus,
          scheduledAt: updatedDelivery.scheduledAt,
          ...updatedDelivery,
        },
      }),
    );

    return updatedDelivery;
  }

  // Reject delivery
  async rejectDelivery(deliveryId: string, rejectedBy: string, reason: string): Promise<Delivery> {
    const delivery = await this.findOne(deliveryId);

    if (delivery.approvalStatus === 'APPROVED') {
      throw new Error('Cannot reject an approved delivery');
    }

    const now = new Date().toISOString();
    const updatedDelivery: Delivery = {
      ...delivery,
      status: 'REJECTED',
      approvalStatus: 'REJECTED',
      rejectedBy,
      rejectedAt: now,
      rejectionReason: reason,
    };

    await this.awsClients.dynamoClient.send(
      new PutCommand({
        TableName: this.deliveriesTable,
        Item: {
          PK: `DELIVERY#${deliveryId}`,
          SK: 'METADATA',
          customerId: updatedDelivery.customerId,
          status: updatedDelivery.status,
          approvalStatus: updatedDelivery.approvalStatus,
          scheduledAt: updatedDelivery.scheduledAt,
          ...updatedDelivery,
        },
      }),
    );

    return updatedDelivery;
  }

  // Format data and save to warehouse S3 folder
  private async formatAndSaveToWarehouse(delivery: Delivery): Promise<string> {
    // Parse full Excel file
    const parsedData = await this.excelParser.parseExcelFromS3(delivery.s3FileKey);
    const mappings = delivery.fieldMappings || [];

    // Apply field mappings to all rows
    let formattedRows = parsedData.rows;

    if (mappings.length > 0) {
      formattedRows = formattedRows.map(row => {
        const formattedRow: any = {};
        mappings.forEach(mapping => {
          if (mapping.targetField !== 'unmapped') {
            formattedRow[mapping.targetField] = row[mapping.sourceField] || '';
          }
        });
        // Add unmapped fields at the end
        mappings
          .filter(m => m.targetField === 'unmapped')
          .forEach(mapping => {
            formattedRow[mapping.sourceField] = row[mapping.sourceField] || '';
          });
        return formattedRow;
      });
    }

    // Convert to CSV format
    const headers = mappings.length > 0
      ? mappings.filter(m => m.targetField !== 'unmapped').map(m => m.targetField)
      : parsedData.headers;

    const csvLines = [headers.join(',')];
    formattedRows.forEach(row => {
      const values = headers.map(header => {
        const value = row[header] || '';
        // Escape commas and quotes in CSV
        return typeof value === 'string' && (value.includes(',') || value.includes('"'))
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      });
      csvLines.push(values.join(','));
    });

    const csvContent = csvLines.join('\n');

    // Save to warehouse folder in S3
    const warehouseS3Key = `warehouse/${delivery.customerId}/${delivery.deliveryId}/formatted-${Date.now()}.csv`;

    await this.awsClients.s3Client.send(
      new PutObjectCommand({
        Bucket: this.s3Bucket,
        Key: warehouseS3Key,
        Body: csvContent,
        ContentType: 'text/csv',
      }),
    );

    return warehouseS3Key;
  }
}
