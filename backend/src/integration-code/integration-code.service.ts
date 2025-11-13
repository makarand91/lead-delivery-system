import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { AwsClientsService } from '../common/aws-clients.service';
import { v4 as uuidv4 } from 'uuid';

export interface IntegrationCode {
  codeId: string;
  customerId: string;
  code: string;
  s3Key?: string;
  crmType: string;
  crmEndpoint: string;
  createdAt: string;
  deployedAt?: string;
  lambdaArn?: string;
  version: number;
}

@Injectable()
export class IntegrationCodeService {
  private readonly integrationCodeTable: string;
  private readonly s3Bucket: string;
  private readonly integrationCodePrefix: string;

  constructor(
    private readonly awsClients: AwsClientsService,
    private readonly configService: ConfigService,
  ) {
    this.integrationCodeTable = this.configService.get('INTEGRATION_CODE_TABLE');
    this.s3Bucket = this.configService.get('S3_BUCKET') || this.configService.get('INTEGRATION_CODE_BUCKET');
    this.integrationCodePrefix = this.configService.get('INTEGRATION_CODE_PREFIX') || '';
  }

  async saveGeneratedCode(data: {
    customerId: string;
    code: string;
    crmType: string;
    crmEndpoint: string;
    s3Key?: string;
  }): Promise<IntegrationCode> {
    const codeId = uuidv4();
    const now = new Date().toISOString();

    // Get existing codes to determine version
    const existingCodes = await this.getCodesByCustomer(data.customerId);
    const version = existingCodes.length + 1;

    const integrationCode: IntegrationCode = {
      codeId,
      customerId: data.customerId,
      code: data.code,
      s3Key: data.s3Key,
      crmType: data.crmType,
      crmEndpoint: data.crmEndpoint,
      createdAt: now,
      version,
    };

    await this.awsClients.dynamoClient.send(
      new PutCommand({
        TableName: this.integrationCodeTable,
        Item: integrationCode,
      }),
    );

    return integrationCode;
  }

  async getCodeById(codeId: string): Promise<IntegrationCode> {
    const result = await this.awsClients.dynamoClient.send(
      new GetCommand({
        TableName: this.integrationCodeTable,
        Key: {
          codeId,
        },
      }),
    );

    if (!result.Item) {
      throw new NotFoundException(`Integration code ${codeId} not found`);
    }

    return result.Item as IntegrationCode;
  }

  async getCodesByCustomer(customerId: string): Promise<IntegrationCode[]> {
    const result = await this.awsClients.dynamoClient.send(
      new QueryCommand({
        TableName: this.integrationCodeTable,
        KeyConditionExpression: 'customerId = :customerId',
        ExpressionAttributeValues: {
          ':customerId': customerId,
        },
        ScanIndexForward: false, // Most recent first
      }),
    );

    return (result.Items || []) as IntegrationCode[];
  }

  async getLatestCode(customerId: string): Promise<IntegrationCode | null> {
    const codes = await this.getCodesByCustomer(customerId);
    return codes.length > 0 ? codes[0] : null;
  }

  async getCodeFromS3(s3Key: string): Promise<string> {
    try {
      const result = await this.awsClients.s3Client.send(
        new GetObjectCommand({
          Bucket: this.s3Bucket,
          Key: s3Key,
        }),
      );

      const bodyContents = await result.Body.transformToString();
      return bodyContents;
    } catch (error) {
      console.error('Error retrieving code from S3:', error);
      throw new NotFoundException('Integration code not found in S3');
    }
  }

  async markAsDeployed(codeId: string, lambdaArn: string): Promise<void> {
    await this.awsClients.dynamoClient.send(
      new PutCommand({
        TableName: this.integrationCodeTable,
        Item: {
          ...(await this.getCodeById(codeId)),
          deployedAt: new Date().toISOString(),
          lambdaArn,
        },
      }),
    );
  }
}
