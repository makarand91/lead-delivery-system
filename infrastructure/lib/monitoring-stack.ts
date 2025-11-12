import * as cdk from 'aws-cdk-lib';
import * as es from 'aws-cdk-lib/aws-elasticsearch';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface MonitoringStackProps extends cdk.StackProps {
  vpcId?: string;
}

export class MonitoringStack extends cdk.Stack {
  public readonly domain: es.CfnDomain;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    const instanceType = process.env.ELASTICSEARCH_INSTANCE_TYPE || 't3.small.search';
    const volumeSize = parseInt(process.env.ELASTICSEARCH_VOLUME_SIZE || '10');

    // ElasticSearch Domain for delivery logs
    this.domain = new es.CfnDomain(this, 'DeliveryLogsDomain', {
      domainName: `${id}-logs`.toLowerCase().replace(/_/g, '-'),
      elasticsearchVersion: '7.10',
      elasticsearchClusterConfig: {
        instanceType: instanceType,
        instanceCount: 1,
        dedicatedMasterEnabled: false,
        zoneAwarenessEnabled: false,
      },
      ebsOptions: {
        ebsEnabled: true,
        volumeType: 'gp3',
        volumeSize: volumeSize,
      },
      encryptionAtRestOptions: {
        enabled: true,
      },
      nodeToNodeEncryptionOptions: {
        enabled: true,
      },
      domainEndpointOptions: {
        enforceHttps: true,
        tlsSecurityPolicy: 'Policy-Min-TLS-1-2-2019-07',
      },
      accessPolicies: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              AWS: '*',
            },
            Action: 'es:*',
            Resource: `arn:aws:es:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:domain/${id}-logs`.toLowerCase().replace(/_/g, '-') + '/*',
            Condition: {
              IpAddress: {
                'aws:SourceIp': ['0.0.0.0/0'], // TODO: Restrict to VPC CIDR in production
              },
            },
          },
        ],
      },
      advancedOptions: {
        'rest.action.multi.allow_explicit_index': 'true',
        'indices.fielddata.cache.size': '40',
      },
    });

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'ElasticsearchDomainEndpoint', {
      value: this.domain.attrDomainEndpoint,
      description: 'ElasticSearch domain endpoint',
      exportName: `${id}-es-endpoint`,
    });

    new cdk.CfnOutput(this, 'ElasticsearchDomainArn', {
      value: this.domain.attrArn,
      description: 'ElasticSearch domain ARN',
      exportName: `${id}-es-arn`,
    });

    new cdk.CfnOutput(this, 'ElasticsearchDomainName', {
      value: this.domain.domainName!,
      description: 'ElasticSearch domain name',
      exportName: `${id}-es-name`,
    });
  }
}
