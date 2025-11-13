import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class StorageStack extends cdk.Stack {
  public readonly buckets: {
    leadFiles: s3.Bucket;
    integrationCode: s3.Bucket;
    warehouseFiles: s3.Bucket;
  };

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lead Files Bucket - stores uploaded Excel files
    const leadFilesBucket = new s3.Bucket(this, 'LeadFilesBucket', {
      bucketName: `${id}-lead-files-${cdk.Aws.ACCOUNT_ID}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          id: 'DeleteOldFiles',
          enabled: true,
          expiration: cdk.Duration.days(90),
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
          ],
          allowedOrigins: ['*'], // TODO: Restrict to frontend domain in production
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Integration Code Bucket - stores generated Lambda code
    const integrationCodeBucket = new s3.Bucket(this, 'IntegrationCodeBucket', {
      bucketName: `${id}-integration-code-${cdk.Aws.ACCOUNT_ID}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Add bucket policies for secure access
    leadFilesBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'DenyInsecureTransport',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['s3:*'],
        resources: [
          leadFilesBucket.bucketArn,
          `${leadFilesBucket.bucketArn}/*`,
        ],
        conditions: {
          Bool: {
            'aws:SecureTransport': 'false',
          },
        },
      })
    );

    integrationCodeBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'DenyInsecureTransport',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['s3:*'],
        resources: [
          integrationCodeBucket.bucketArn,
          `${integrationCodeBucket.bucketArn}/*`,
        ],
        conditions: {
          Bool: {
            'aws:SecureTransport': 'false',
          },
        },
      })
    );

    // Warehouse Files Bucket - stores formatted/validated files for data warehouse
    const warehouseFilesBucket = new s3.Bucket(this, 'WarehouseFilesBucket', {
      bucketName: `${id}-warehouse-files-${cdk.Aws.ACCOUNT_ID}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          id: 'TransitionToIA',
          enabled: true,
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    warehouseFilesBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        sid: 'DenyInsecureTransport',
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
        actions: ['s3:*'],
        resources: [
          warehouseFilesBucket.bucketArn,
          `${warehouseFilesBucket.bucketArn}/*`,
        ],
        conditions: {
          Bool: {
            'aws:SecureTransport': 'false',
          },
        },
      })
    );

    this.buckets = {
      leadFiles: leadFilesBucket,
      integrationCode: integrationCodeBucket,
      warehouseFiles: warehouseFilesBucket,
    };

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'LeadFilesBucketName', {
      value: leadFilesBucket.bucketName,
      description: 'S3 bucket for lead files',
      exportName: `${id}-lead-files-bucket`,
    });

    new cdk.CfnOutput(this, 'LeadFilesBucketArn', {
      value: leadFilesBucket.bucketArn,
      description: 'S3 bucket ARN for lead files',
      exportName: `${id}-lead-files-bucket-arn`,
    });

    new cdk.CfnOutput(this, 'IntegrationCodeBucketName', {
      value: integrationCodeBucket.bucketName,
      description: 'S3 bucket for integration code',
      exportName: `${id}-integration-code-bucket`,
    });

    new cdk.CfnOutput(this, 'IntegrationCodeBucketArn', {
      value: integrationCodeBucket.bucketArn,
      description: 'S3 bucket ARN for integration code',
      exportName: `${id}-integration-code-bucket-arn`,
    });

    new cdk.CfnOutput(this, 'WarehouseFilesBucketName', {
      value: warehouseFilesBucket.bucketName,
      description: 'S3 bucket for warehouse files (formatted/validated)',
      exportName: `${id}-warehouse-files-bucket`,
    });

    new cdk.CfnOutput(this, 'WarehouseFilesBucketArn', {
      value: warehouseFilesBucket.bucketArn,
      description: 'S3 bucket ARN for warehouse files',
      exportName: `${id}-warehouse-files-bucket-arn`,
    });
  }
}
