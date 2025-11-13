import * as cdk from 'aws-cdk-lib';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface MonitoringStackProps extends cdk.StackProps {
  opensearchEndpoint: string;
  opensearchUsername?: string;
  opensearchPassword?: string;
}

export class MonitoringStack extends cdk.Stack {
  public readonly opensearchEndpoint: string;
  public readonly opensearchSecret?: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    this.opensearchEndpoint = props.opensearchEndpoint;

    // If credentials provided, store them in Secrets Manager
    if (props.opensearchUsername && props.opensearchPassword) {
      this.opensearchSecret = new secretsmanager.Secret(this, 'OpenSearchSecret', {
        secretName: `${id}-opensearch-credentials`,
        description: 'OpenSearch basic authentication credentials',
        secretObjectValue: {
          username: cdk.SecretValue.unsafePlainText(props.opensearchUsername),
          password: cdk.SecretValue.unsafePlainText(props.opensearchPassword),
          endpoint: cdk.SecretValue.unsafePlainText(props.opensearchEndpoint),
        },
      });

      // CloudFormation outputs
      new cdk.CfnOutput(this, 'OpenSearchSecretArn', {
        value: this.opensearchSecret.secretArn,
        description: 'Secrets Manager ARN for OpenSearch credentials',
        exportName: `${id}-opensearch-secret-arn`,
      });
    }

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'OpenSearchEndpoint', {
      value: this.opensearchEndpoint,
      description: 'OpenSearch domain endpoint (existing)',
      exportName: `${id}-opensearch-endpoint`,
    });
  }
}
