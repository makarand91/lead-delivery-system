import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { AwsClientsService } from '../common/aws-clients.service';
import { OpenSearchClientService } from '../common/opensearch-client.service';

export interface DeliveryLog {
  deliveryId: string;
  leadIndex: number;
  leadData: any;
  status: 'SUCCESS' | 'FAILED';
  errorMessage?: string;
  crmId?: string;
  retryCount: number;
  processedAt: string;
  ttl?: number; // Auto-delete after 90 days
}

@Injectable()
export class LogsService {
  private readonly tableName: string;

  constructor(
    private awsClients: AwsClientsService,
    private opensearchClient: OpenSearchClientService,
    private configService: ConfigService,
  ) {
    this.tableName = this.configService.get('DELIVERY_LOGS_TABLE');
  }

  async createLog(log: DeliveryLog): Promise<void> {
    const ttl = Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60); // 90 days from now

    await this.awsClients.dynamoClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `DELIVERY#${log.deliveryId}`,
          SK: `LEAD#${log.leadIndex}`,
          status: log.status,
          processedAt: log.processedAt,
          ttl,
          ...log,
        },
      }),
    );

    // Also send to OpenSearch for search capabilities
    await this.sendToOpenSearch(log);
  }

  async findByDelivery(deliveryId: string): Promise<DeliveryLog[]> {
    const result = await this.awsClients.dynamoClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `DELIVERY#${deliveryId}`,
        },
      }),
    );

    return (result.Items || []) as DeliveryLog[];
  }

  async findFailedLeads(deliveryId: string): Promise<DeliveryLog[]> {
    const result = await this.awsClients.dynamoClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk',
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':pk': `DELIVERY#${deliveryId}`,
          ':status': 'FAILED',
        },
      }),
    );

    return (result.Items || []) as DeliveryLog[];
  }

  private async sendToOpenSearch(log: DeliveryLog): Promise<void> {
    try {
      const indexName = 'delivery-logs';
      const document = {
        deliveryId: log.deliveryId,
        leadIndex: log.leadIndex,
        status: log.status,
        errorMessage: log.errorMessage,
        crmId: log.crmId,
        retryCount: log.retryCount,
        processedAt: log.processedAt,
        timestamp: new Date().toISOString(),
      };

      const docId = `${log.deliveryId}-${log.leadIndex}`;
      await this.opensearchClient.indexDocument(indexName, docId, document);
    } catch (error) {
      console.error('Error sending log to OpenSearch:', error);
      // Don't throw error, logs should still be saved to DynamoDB
    }
  }

  async searchLogs(query: string): Promise<any[]> {
    try {
      const searchQuery = {
        query: {
          multi_match: {
            query: query,
            fields: ['deliveryId', 'errorMessage', 'crmId'],
          },
        },
        size: 100,
        sort: [
          {
            processedAt: {
              order: 'desc',
            },
          },
        ],
      };

      const result = await this.opensearchClient.search('delivery-logs', searchQuery);
      return result.hits.hits.map((hit: any) => hit._source);
    } catch (error) {
      console.error('Error searching logs:', error);
      return [];
    }
  }
}
