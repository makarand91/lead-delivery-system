import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

@Injectable()
export class AwsClientsService {
  public readonly dynamoClient: DynamoDBDocumentClient;
  public readonly s3Client: S3Client;
  public readonly lambdaClient: LambdaClient;
  public readonly bedrockClient: BedrockRuntimeClient;

  constructor(private configService: ConfigService) {
    const region = this.configService.get('AWS_REGION') || 'us-east-1';

    const dynamoDBClient = new DynamoDBClient({ region });
    this.dynamoClient = DynamoDBDocumentClient.from(dynamoDBClient, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
      },
    });

    this.s3Client = new S3Client({ region });
    this.lambdaClient = new LambdaClient({ region });

    const bedrockRegion = this.configService.get('BEDROCK_REGION') || region;
    this.bedrockClient = new BedrockRuntimeClient({ region: bedrockRegion });
  }
}
