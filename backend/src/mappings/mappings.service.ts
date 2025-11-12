import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutCommand, GetCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { AwsClientsService } from '../common/aws-clients.service';
import { v4 as uuidv4 } from 'uuid';

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  transformation?: string;
  transformationParams?: any;
  required?: boolean;
}

export interface Mapping {
  mappingId: string;
  customerId: string;
  name: string;
  fieldMappings: FieldMapping[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class MappingsService {
  private readonly tableName: string;

  constructor(
    private awsClients: AwsClientsService,
    private configService: ConfigService,
  ) {
    this.tableName = this.configService.get('FIELD_MAPPINGS_TABLE');
  }

  async create(data: Partial<Mapping>): Promise<Mapping> {
    const mappingId = uuidv4();
    const now = new Date().toISOString();

    const mapping: Mapping = {
      mappingId,
      customerId: data.customerId,
      name: data.name,
      fieldMappings: data.fieldMappings || [],
      isDefault: data.isDefault || false,
      createdAt: now,
      updatedAt: now,
    };

    await this.awsClients.dynamoClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `CUSTOMER#${mapping.customerId}`,
          SK: `MAPPING#${mappingId}`,
          ...mapping,
        },
      }),
    );

    return mapping;
  }

  async findOne(customerId: string, mappingId: string): Promise<Mapping> {
    const result = await this.awsClients.dynamoClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `CUSTOMER#${customerId}`,
          SK: `MAPPING#${mappingId}`,
        },
      }),
    );

    if (!result.Item) {
      throw new NotFoundException(`Mapping ${mappingId} not found`);
    }

    return result.Item as Mapping;
  }

  async findByCustomer(customerId: string): Promise<Mapping[]> {
    const result = await this.awsClients.dynamoClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `CUSTOMER#${customerId}`,
          ':sk': 'MAPPING#',
        },
      }),
    );

    return (result.Items || []) as Mapping[];
  }

  async update(customerId: string, mappingId: string, data: Partial<Mapping>): Promise<Mapping> {
    const now = new Date().toISOString();

    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (data.name) {
      updateExpressions.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = data.name;
    }

    if (data.fieldMappings) {
      updateExpressions.push('fieldMappings = :fieldMappings');
      expressionAttributeValues[':fieldMappings'] = data.fieldMappings;
    }

    if (data.isDefault !== undefined) {
      updateExpressions.push('isDefault = :isDefault');
      expressionAttributeValues[':isDefault'] = data.isDefault;
    }

    updateExpressions.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = now;

    if (updateExpressions.length > 1) {
      await this.awsClients.dynamoClient.send(
        new PutCommand({
          TableName: this.tableName,
          Key: {
            PK: `CUSTOMER#${customerId}`,
            SK: `MAPPING#${mappingId}`,
          },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
          ExpressionAttributeValues: expressionAttributeValues,
        }),
      );
    }

    return this.findOne(customerId, mappingId);
  }

  async delete(customerId: string, mappingId: string): Promise<void> {
    await this.awsClients.dynamoClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          PK: `CUSTOMER#${customerId}`,
          SK: `MAPPING#${mappingId}`,
        },
      }),
    );
  }
}
