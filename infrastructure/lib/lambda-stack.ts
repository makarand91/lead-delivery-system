import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface LambdaStackProps extends cdk.StackProps {
  tables: {
    customers: dynamodb.Table;
    deliveries: dynamodb.Table;
    fieldMappings: dynamodb.Table;
    deliveryLogs: dynamodb.Table;
    integrationCode: dynamodb.Table;
  };
  buckets: {
    leadFiles: s3.Bucket;
    integrationCode: s3.Bucket;
    warehouseFiles: s3.Bucket;
  };
  userPool: cognito.IUserPool;
  opensearchEndpoint: string;
  opensearchSecret?: secretsmanager.ISecret;
  vpcId?: string;
}

export class LambdaStack extends cdk.Stack {
  public readonly apiLambda: nodejs.NodejsFunction;
  public readonly batchProcessorLambda: nodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdaStackProps) {
    super(scope, id, props);

    const lambdaMemory = parseInt(process.env.LAMBDA_MEMORY_SIZE || '1024');
    const lambdaTimeout = parseInt(process.env.LAMBDA_TIMEOUT || '300');
    const batchSchedule = process.env.BATCH_SCHEDULE || 'cron(0 * * * ? *)';

    // Common environment variables
    const commonEnvironment: Record<string, string> = {
      CUSTOMERS_TABLE: props.tables.customers.tableName,
      DELIVERIES_TABLE: props.tables.deliveries.tableName,
      FIELD_MAPPINGS_TABLE: props.tables.fieldMappings.tableName,
      DELIVERY_LOGS_TABLE: props.tables.deliveryLogs.tableName,
      INTEGRATION_CODE_TABLE: props.tables.integrationCode.tableName,
      LEAD_FILES_BUCKET: props.buckets.leadFiles.bucketName,
      INTEGRATION_CODE_BUCKET: props.buckets.integrationCode.bucketName,
      WAREHOUSE_FILES_BUCKET: props.buckets.warehouseFiles.bucketName,
      USER_POOL_ID: props.userPool.userPoolId,
      OPENSEARCH_ENDPOINT: props.opensearchEndpoint,
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      NODE_OPTIONS: '--enable-source-maps',
    };

    // Add Secrets Manager ARN if OpenSearch secret is provided
    if (props.opensearchSecret) {
      commonEnvironment.OPENSEARCH_SECRET_ARN = props.opensearchSecret.secretArn;
    }

    // API Lambda - Main NestJS application
    this.apiLambda = new nodejs.NodejsFunction(this, 'ApiLambda', {
      functionName: `${id}-api`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: '../backend/src/lambda.ts',
      handler: 'handler',
      memorySize: lambdaMemory,
      timeout: cdk.Duration.seconds(lambdaTimeout),
      environment: commonEnvironment,
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk'],
        nodeModules: [
          '@nestjs/core',
          '@nestjs/common',
          '@nestjs/platform-express',
          'aws-lambda',
          'serverless-http',
        ],
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Grant permissions to API Lambda
    props.tables.customers.grantReadWriteData(this.apiLambda);
    props.tables.deliveries.grantReadWriteData(this.apiLambda);
    props.tables.fieldMappings.grantReadWriteData(this.apiLambda);
    props.tables.deliveryLogs.grantReadWriteData(this.apiLambda);
    props.tables.integrationCode.grantReadWriteData(this.apiLambda);
    props.buckets.leadFiles.grantReadWrite(this.apiLambda);
    props.buckets.integrationCode.grantReadWrite(this.apiLambda);

    // Grant Bedrock access for AI code generation
    this.apiLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'bedrock:InvokeModel',
          'bedrock:InvokeModelWithResponseStream',
        ],
        resources: ['*'],
      })
    );

    // Grant Lambda deployment permissions
    this.apiLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'lambda:CreateFunction',
          'lambda:UpdateFunctionCode',
          'lambda:UpdateFunctionConfiguration',
          'lambda:GetFunction',
          'lambda:DeleteFunction',
          'lambda:PublishVersion',
          'lambda:CreateAlias',
          'lambda:UpdateAlias',
          'iam:PassRole',
        ],
        resources: ['*'],
      })
    );

    // Grant Secrets Manager access for OpenSearch credentials
    if (props.opensearchSecret) {
      props.opensearchSecret.grantRead(this.apiLambda);
    }

    // Batch Processor Lambda - Scheduled job
    this.batchProcessorLambda = new nodejs.NodejsFunction(this, 'BatchProcessorLambda', {
      functionName: `${id}-batch-processor`,
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: '../lambdas/batch-processor/src/index.ts',
      handler: 'handler',
      memorySize: lambdaMemory,
      timeout: cdk.Duration.seconds(900), // 15 minutes for batch processing
      environment: {
        ...commonEnvironment,
        CONCURRENT_DELIVERIES: process.env.BATCH_CONCURRENT_DELIVERIES || '10',
      },
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk'],
      },
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Grant permissions to Batch Processor Lambda
    props.tables.customers.grantReadData(this.batchProcessorLambda);
    props.tables.deliveries.grantReadWriteData(this.batchProcessorLambda);
    props.tables.fieldMappings.grantReadData(this.batchProcessorLambda);
    props.tables.deliveryLogs.grantReadWriteData(this.batchProcessorLambda);
    props.buckets.leadFiles.grantRead(this.batchProcessorLambda);
    props.buckets.warehouseFiles.grantReadWrite(this.batchProcessorLambda);

    // Grant permission to invoke customer Lambda functions
    this.batchProcessorLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['lambda:InvokeFunction'],
        resources: ['*'], // Customer Lambdas will be created dynamically
      })
    );

    // Grant Secrets Manager access for OpenSearch credentials
    if (props.opensearchSecret) {
      props.opensearchSecret.grantRead(this.batchProcessorLambda);
    }

    // EventBridge rule for batch processing
    const batchScheduleRule = new events.Rule(this, 'BatchScheduleRule', {
      ruleName: `${id}-batch-schedule`,
      description: 'Triggers batch processor Lambda on schedule',
      schedule: events.Schedule.expression(batchSchedule),
      enabled: true,
    });

    batchScheduleRule.addTarget(
      new targets.LambdaFunction(this.batchProcessorLambda, {
        retryAttempts: 2,
      })
    );

    // Lambda execution role for customer Lambda functions (template)
    const customerLambdaRole = new iam.Role(this, 'CustomerLambdaRole', {
      roleName: `${id}-customer-lambda-role`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Customer Lambda functions don't need direct OpenSearch access
    // Logs are written via the batch processor

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'ApiLambdaArn', {
      value: this.apiLambda.functionArn,
      description: 'API Lambda function ARN',
      exportName: `${id}-api-lambda-arn`,
    });

    new cdk.CfnOutput(this, 'ApiLambdaName', {
      value: this.apiLambda.functionName,
      description: 'API Lambda function name',
      exportName: `${id}-api-lambda-name`,
    });

    new cdk.CfnOutput(this, 'BatchProcessorLambdaArn', {
      value: this.batchProcessorLambda.functionArn,
      description: 'Batch Processor Lambda function ARN',
      exportName: `${id}-batch-processor-arn`,
    });

    new cdk.CfnOutput(this, 'CustomerLambdaRoleArn', {
      value: customerLambdaRole.roleArn,
      description: 'IAM role ARN for customer Lambda functions',
      exportName: `${id}-customer-lambda-role-arn`,
    });
  }
}
