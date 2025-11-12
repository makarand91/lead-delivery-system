import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DatabaseStack extends cdk.Stack {
  public readonly tables: {
    customers: dynamodb.Table;
    deliveries: dynamodb.Table;
    fieldMappings: dynamodb.Table;
    deliveryLogs: dynamodb.Table;
    integrationCode: dynamodb.Table;
  };

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Customers Table
    // PK: CUSTOMER#{customerId}, SK: METADATA
    const customersTable = new dynamodb.Table(this, 'CustomersTable', {
      tableName: `${id}-customers`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // GSI for querying customers by team
    customersTable.addGlobalSecondaryIndex({
      indexName: 'TeamIndex',
      partitionKey: { name: 'teamId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Deliveries Table
    // PK: DELIVERY#{deliveryId}, SK: METADATA
    const deliveriesTable = new dynamodb.Table(this, 'DeliveriesTable', {
      tableName: `${id}-deliveries`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // GSI for querying deliveries by customer
    deliveriesTable.addGlobalSecondaryIndex({
      indexName: 'CustomerIndex',
      partitionKey: { name: 'customerId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI for querying deliveries by status
    deliveriesTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'scheduledAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Field Mappings Table
    // PK: CUSTOMER#{customerId}, SK: MAPPING#{mappingId}
    const fieldMappingsTable = new dynamodb.Table(this, 'FieldMappingsTable', {
      tableName: `${id}-field-mappings`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Delivery Logs Table
    // PK: DELIVERY#{deliveryId}, SK: LEAD#{leadIndex}
    const deliveryLogsTable = new dynamodb.Table(this, 'DeliveryLogsTable', {
      tableName: `${id}-delivery-logs`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      timeToLiveAttribute: 'ttl', // Auto-delete logs after 90 days
    });

    // GSI for querying logs by status
    deliveryLogsTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'processedAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Integration Code Table
    // PK: CUSTOMER#{customerId}, SK: VERSION#{version}
    const integrationCodeTable = new dynamodb.Table(this, 'IntegrationCodeTable', {
      tableName: `${id}-integration-code`,
      partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.tables = {
      customers: customersTable,
      deliveries: deliveriesTable,
      fieldMappings: fieldMappingsTable,
      deliveryLogs: deliveryLogsTable,
      integrationCode: integrationCodeTable,
    };

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'CustomersTableName', {
      value: customersTable.tableName,
      description: 'Customers DynamoDB table name',
      exportName: `${id}-customers-table`,
    });

    new cdk.CfnOutput(this, 'DeliveriesTableName', {
      value: deliveriesTable.tableName,
      description: 'Deliveries DynamoDB table name',
      exportName: `${id}-deliveries-table`,
    });

    new cdk.CfnOutput(this, 'FieldMappingsTableName', {
      value: fieldMappingsTable.tableName,
      description: 'Field Mappings DynamoDB table name',
      exportName: `${id}-field-mappings-table`,
    });

    new cdk.CfnOutput(this, 'DeliveryLogsTableName', {
      value: deliveryLogsTable.tableName,
      description: 'Delivery Logs DynamoDB table name',
      exportName: `${id}-delivery-logs-table`,
    });

    new cdk.CfnOutput(this, 'IntegrationCodeTableName', {
      value: integrationCodeTable.tableName,
      description: 'Integration Code DynamoDB table name',
      exportName: `${id}-integration-code-table`,
    });
  }
}
