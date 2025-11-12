import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateFunctionCommand,
  UpdateFunctionCodeCommand,
  GetFunctionCommand,
  Runtime,
} from '@aws-sdk/client-lambda';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { AwsClientsService } from '../common/aws-clients.service';
import * as AdmZip from 'adm-zip';

export interface DeployLambdaRequest {
  customerId: string;
  code: string;
  functionName?: string;
}

@Injectable()
export class LambdaDeployerService {
  private readonly integrationCodeBucket: string;
  private readonly customerLambdaRoleArn: string;

  constructor(
    private awsClients: AwsClientsService,
    private configService: ConfigService,
  ) {
    this.integrationCodeBucket = this.configService.get('INTEGRATION_CODE_BUCKET');
    this.customerLambdaRoleArn = this.configService.get('CUSTOMER_LAMBDA_ROLE_ARN');
  }

  async deployLambda(request: DeployLambdaRequest): Promise<{ lambdaArn: string; functionName: string }> {
    const functionName = request.functionName || `customer-integration-${request.customerId}`;

    // Create deployment package
    const zipBuffer = await this.createDeploymentPackage(request.code);

    // Save code to S3 for version control
    await this.saveCodeToS3(request.customerId, request.code);

    // Check if Lambda exists
    const lambdaExists = await this.checkLambdaExists(functionName);

    let lambdaArn: string;

    if (lambdaExists) {
      // Update existing Lambda
      lambdaArn = await this.updateLambdaFunction(functionName, zipBuffer);
    } else {
      // Create new Lambda
      lambdaArn = await this.createLambdaFunction(functionName, zipBuffer);
    }

    return { lambdaArn, functionName };
  }

  private async createDeploymentPackage(code: string): Promise<Buffer> {
    const zip = new AdmZip();

    // Add Lambda handler code
    zip.addFile('index.js', Buffer.from(code, 'utf-8'));

    // Add package.json
    const packageJson = {
      name: 'customer-integration',
      version: '1.0.0',
      main: 'index.js',
      dependencies: {
        axios: '^1.6.0',
        'date-fns': '^2.30.0',
      },
    };
    zip.addFile('package.json', Buffer.from(JSON.stringify(packageJson, null, 2), 'utf-8'));

    return zip.toBuffer();
  }

  private async saveCodeToS3(customerId: string, code: string): Promise<void> {
    const key = `customers/${customerId}/integration-code/${Date.now()}.js`;

    await this.awsClients.s3Client.send(
      new PutObjectCommand({
        Bucket: this.integrationCodeBucket,
        Key: key,
        Body: code,
        ContentType: 'application/javascript',
      }),
    );
  }

  private async checkLambdaExists(functionName: string): Promise<boolean> {
    try {
      await this.awsClients.lambdaClient.send(
        new GetFunctionCommand({ FunctionName: functionName }),
      );
      return true;
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        return false;
      }
      throw error;
    }
  }

  private async createLambdaFunction(functionName: string, zipBuffer: Buffer): Promise<string> {
    const result = await this.awsClients.lambdaClient.send(
      new CreateFunctionCommand({
        FunctionName: functionName,
        Runtime: Runtime.nodejs20x,
        Role: this.customerLambdaRoleArn,
        Handler: 'index.handler',
        Code: {
          ZipFile: zipBuffer,
        },
        Timeout: 300,
        MemorySize: 512,
        Environment: {
          Variables: {
            NODE_ENV: 'production',
          },
        },
        Description: 'Customer-specific CRM integration Lambda function',
      }),
    );

    return result.FunctionArn;
  }

  private async updateLambdaFunction(functionName: string, zipBuffer: Buffer): Promise<string> {
    const result = await this.awsClients.lambdaClient.send(
      new UpdateFunctionCodeCommand({
        FunctionName: functionName,
        ZipFile: zipBuffer,
      }),
    );

    return result.FunctionArn;
  }
}
