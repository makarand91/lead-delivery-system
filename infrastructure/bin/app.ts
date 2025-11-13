#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import { DatabaseStack } from '../lib/database-stack';
import { StorageStack } from '../lib/storage-stack';
import { AuthStack } from '../lib/auth-stack';
import { LambdaStack } from '../lib/lambda-stack';
import { ApiStack } from '../lib/api-stack';
import { MonitoringStack } from '../lib/monitoring-stack';

// Load environment variables
dotenv.config();

const app = new cdk.App();

const env = {
  account: process.env.AWS_ACCOUNT_ID || process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.AWS_REGION || process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

const appName = process.env.APP_NAME || 'lead-delivery-system';
const environment = process.env.ENVIRONMENT || 'dev';
const stackPrefix = `${appName}-${environment}`;

// Database Stack - DynamoDB tables
const databaseStack = new DatabaseStack(app, `${stackPrefix}-database`, {
  env,
  stackName: `${stackPrefix}-database`,
  description: 'DynamoDB tables for lead delivery system',
});

// Storage Stack - S3 buckets
const storageStack = new StorageStack(app, `${stackPrefix}-storage`, {
  env,
  stackName: `${stackPrefix}-storage`,
  description: 'S3 buckets for lead files and generated code',
});

// Auth Stack - Use existing Cognito User Pool
const authStack = new AuthStack(app, `${stackPrefix}-auth`, {
  env,
  stackName: `${stackPrefix}-auth`,
  description: 'Cognito authentication configuration for lead delivery system',
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  userPoolClientId: process.env.COGNITO_USER_POOL_CLIENT_ID, // Optional - will create new if not provided
});

// Monitoring Stack - Use existing OpenSearch with basic auth
const monitoringStack = new MonitoringStack(app, `${stackPrefix}-monitoring`, {
  env,
  stackName: `${stackPrefix}-monitoring`,
  description: 'OpenSearch configuration for delivery logs',
  opensearchEndpoint: process.env.OPENSEARCH_ENDPOINT!,
  opensearchUsername: process.env.OPENSEARCH_USERNAME,
  opensearchPassword: process.env.OPENSEARCH_PASSWORD,
});

// Lambda Stack - API Lambda and Batch Processor
const lambdaStack = new LambdaStack(app, `${stackPrefix}-lambda`, {
  env,
  stackName: `${stackPrefix}-lambda`,
  description: 'Lambda functions for lead delivery system',
  tables: databaseStack.tables,
  buckets: storageStack.buckets,
  userPool: authStack.userPool,
  opensearchEndpoint: monitoringStack.opensearchEndpoint,
  opensearchSecret: monitoringStack.opensearchSecret,
  vpcId: process.env.EXISTING_VPC_ID,
});

// API Stack - API Gateway
const apiStack = new ApiStack(app, `${stackPrefix}-api`, {
  env,
  stackName: `${stackPrefix}-api`,
  description: 'API Gateway for lead delivery system',
  apiLambda: lambdaStack.apiLambda,
  userPool: authStack.userPool,
});

// Add dependencies
storageStack.addDependency(databaseStack);
authStack.addDependency(databaseStack);
monitoringStack.addDependency(databaseStack);
lambdaStack.addDependency(databaseStack);
lambdaStack.addDependency(storageStack);
lambdaStack.addDependency(authStack);
lambdaStack.addDependency(monitoringStack);
apiStack.addDependency(lambdaStack);

// Add tags to all stacks
cdk.Tags.of(app).add('Application', appName);
cdk.Tags.of(app).add('Environment', environment);
cdk.Tags.of(app).add('ManagedBy', 'CDK');

app.synth();
