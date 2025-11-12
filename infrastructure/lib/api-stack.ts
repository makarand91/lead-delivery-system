import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface ApiStackProps extends cdk.StackProps {
  apiLambda: lambda.Function;
  userPool: cognito.UserPool;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly authorizer: apigateway.CognitoUserPoolsAuthorizer;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const throttleRateLimit = parseInt(process.env.API_THROTTLE_RATE_LIMIT || '1000');
    const throttleBurstLimit = parseInt(process.env.API_THROTTLE_BURST_LIMIT || '2000');

    // Access logs for API Gateway
    const accessLogGroup = new logs.LogGroup(this, 'ApiAccessLogs', {
      logGroupName: `/aws/apigateway/${id}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // REST API
    this.api = new apigateway.RestApi(this, 'Api', {
      restApiName: `${id}-api`,
      description: 'Lead Delivery System API',
      deployOptions: {
        stageName: 'v1',
        throttlingRateLimit: throttleRateLimit,
        throttlingBurstLimit: throttleBurstLimit,
        dataTraceEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        accessLogDestination: new apigateway.LogGroupLogDestination(accessLogGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
          caller: true,
          httpMethod: true,
          ip: true,
          protocol: true,
          requestTime: true,
          resourcePath: true,
          responseLength: true,
          status: true,
          user: true,
        }),
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS, // TODO: Restrict in production
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true,
      },
      cloudWatchRole: true,
    });

    // Cognito Authorizer
    this.authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      authorizerName: `${id}-cognito-authorizer`,
      cognitoUserPools: [props.userPool],
      identitySource: 'method.request.header.Authorization',
      resultsCacheTtl: cdk.Duration.minutes(5),
    });

    // Lambda integration
    const lambdaIntegration = new apigateway.LambdaIntegration(props.apiLambda, {
      proxy: true,
      allowTestInvoke: true,
    });

    // API Gateway proxy resource - forwards all requests to Lambda
    const proxyResource = this.api.root.addProxy({
      defaultIntegration: lambdaIntegration,
      anyMethod: true,
      defaultMethodOptions: {
        authorizationType: apigateway.AuthorizationType.COGNITO,
        authorizer: this.authorizer,
      },
    });

    // Health check endpoint (no auth required)
    const healthResource = this.api.root.addResource('health');
    healthResource.addMethod('GET', lambdaIntegration, {
      authorizationType: apigateway.AuthorizationType.NONE,
    });

    // Usage plan for rate limiting
    const usagePlan = this.api.addUsagePlan('UsagePlan', {
      name: `${id}-usage-plan`,
      description: 'Usage plan for Lead Delivery System API',
      throttle: {
        rateLimit: throttleRateLimit,
        burstLimit: throttleBurstLimit,
      },
      quota: {
        limit: 100000,
        period: apigateway.Period.MONTH,
      },
    });

    usagePlan.addApiStage({
      stage: this.api.deploymentStage,
    });

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
      exportName: `${id}-api-url`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'API Gateway ID',
      exportName: `${id}-api-id`,
    });

    new cdk.CfnOutput(this, 'ApiStage', {
      value: this.api.deploymentStage.stageName,
      description: 'API Gateway stage',
      exportName: `${id}-api-stage`,
    });
  }
}
