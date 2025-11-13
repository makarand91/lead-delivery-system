import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface AuthStackProps extends cdk.StackProps {
  userPoolId: string;
  userPoolClientId?: string;
}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.IUserPool;
  public readonly userPoolClient: cognito.IUserPoolClient;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    // Import existing Cognito User Pool
    this.userPool = cognito.UserPool.fromUserPoolId(
      this,
      'ExistingUserPool',
      props.userPoolId,
    );

    // Import existing User Pool Client if provided, otherwise create new
    if (props.userPoolClientId) {
      this.userPoolClient = cognito.UserPoolClient.fromUserPoolClientId(
        this,
        'ExistingUserPoolClient',
        props.userPoolClientId,
      );
    } else {
      // Create new client for existing User Pool
      this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
        userPoolClientName: `${id}-client`,
        userPool: this.userPool as cognito.UserPool,
        authFlows: {
          userPassword: true,
          userSrp: true,
          custom: true,
        },
        oAuth: {
          flows: {
            authorizationCodeGrant: true,
            implicitCodeGrant: true,
          },
          scopes: [
            cognito.OAuthScope.EMAIL,
            cognito.OAuthScope.OPENID,
            cognito.OAuthScope.PROFILE,
          ],
          callbackUrls: [
            'http://localhost:3000/callback',
            'https://localhost:3000/callback',
          ],
          logoutUrls: ['http://localhost:3000', 'https://localhost:3000'],
        },
        generateSecret: false,
        preventUserExistenceErrors: true,
        accessTokenValidity: cdk.Duration.hours(1),
        idTokenValidity: cdk.Duration.hours(1),
        refreshTokenValidity: cdk.Duration.days(30),
      });

      new cdk.CfnOutput(this, 'UserPoolClientId', {
        value: (this.userPoolClient as cognito.UserPoolClient).userPoolClientId,
        description: 'Cognito User Pool Client ID (newly created)',
        exportName: `${id}-user-pool-client-id`,
      });
    }

    // CloudFormation outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: props.userPoolId,
      description: 'Cognito User Pool ID (existing)',
      exportName: `${id}-user-pool-id`,
    });

    new cdk.CfnOutput(this, 'UserPoolArn', {
      value: this.userPool.userPoolArn,
      description: 'Cognito User Pool ARN',
      exportName: `${id}-user-pool-arn`,
    });
  }
}
