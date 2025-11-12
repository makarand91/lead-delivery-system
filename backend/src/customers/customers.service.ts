import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { AwsClientsService } from '../common/aws-clients.service';
import { v4 as uuidv4 } from 'uuid';

export interface Customer {
  customerId: string;
  teamId: string;
  name: string;
  crmType: 'Salesforce' | 'HubSpot' | 'Pipedrive' | 'Custom';
  crmEndpoint: string;
  lambdaArn?: string;
  credentials?: any;
  customContext?: any;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

@Injectable()
export class CustomersService {
  private readonly tableName: string;

  constructor(
    private awsClients: AwsClientsService,
    private configService: ConfigService,
  ) {
    this.tableName = this.configService.get('CUSTOMERS_TABLE');
  }

  async create(data: Partial<Customer>): Promise<Customer> {
    const customerId = uuidv4();
    const now = new Date().toISOString();

    const customer: Customer = {
      customerId,
      teamId: data.teamId || 'default-team',
      name: data.name,
      crmType: data.crmType,
      crmEndpoint: data.crmEndpoint,
      credentials: data.credentials || {},
      customContext: data.customContext || {},
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy,
    };

    await this.awsClients.dynamoClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: `CUSTOMER#${customerId}`,
          SK: 'METADATA',
          ...customer,
        },
      }),
    );

    return customer;
  }

  async findOne(customerId: string): Promise<Customer> {
    const result = await this.awsClients.dynamoClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `CUSTOMER#${customerId}`,
          SK: 'METADATA',
        },
      }),
    );

    if (!result.Item) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    return result.Item as Customer;
  }

  async findByTeam(teamId: string): Promise<Customer[]> {
    const result = await this.awsClients.dynamoClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: 'TeamIndex',
        KeyConditionExpression: 'teamId = :teamId',
        ExpressionAttributeValues: {
          ':teamId': teamId,
        },
      }),
    );

    return (result.Items || []) as Customer[];
  }

  async update(customerId: string, data: Partial<Customer>): Promise<Customer> {
    const now = new Date().toISOString();

    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (data.name) {
      updateExpressions.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = data.name;
    }

    if (data.crmEndpoint) {
      updateExpressions.push('crmEndpoint = :crmEndpoint');
      expressionAttributeValues[':crmEndpoint'] = data.crmEndpoint;
    }

    if (data.lambdaArn) {
      updateExpressions.push('lambdaArn = :lambdaArn');
      expressionAttributeValues[':lambdaArn'] = data.lambdaArn;
    }

    if (data.credentials) {
      updateExpressions.push('credentials = :credentials');
      expressionAttributeValues[':credentials'] = data.credentials;
    }

    if (data.customContext) {
      updateExpressions.push('customContext = :customContext');
      expressionAttributeValues[':customContext'] = data.customContext;
    }

    updateExpressions.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = now;

    await this.awsClients.dynamoClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `CUSTOMER#${customerId}`,
          SK: 'METADATA',
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        ExpressionAttributeValues: expressionAttributeValues,
      }),
    );

    return this.findOne(customerId);
  }

  async delete(customerId: string): Promise<void> {
    await this.awsClients.dynamoClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: {
          PK: `CUSTOMER#${customerId}`,
          SK: 'METADATA',
        },
      }),
    );
  }
}
