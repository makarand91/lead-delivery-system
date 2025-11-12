import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LambdaDeployerService, DeployLambdaRequest } from './lambda-deployer.service';
import { CustomersService } from '../customers/customers.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Lambda Deployer')
@ApiBearerAuth()
@Controller('lambda-deployer')
@UseGuards(AuthGuard)
export class LambdaDeployerController {
  constructor(
    private lambdaDeployerService: LambdaDeployerService,
    private customersService: CustomersService,
  ) {}

  @Post('deploy')
  @ApiOperation({ summary: 'Deploy customer Lambda function' })
  async deployLambda(@Body() request: DeployLambdaRequest) {
    const result = await this.lambdaDeployerService.deployLambda(request);

    // Update customer with Lambda ARN
    await this.customersService.update(request.customerId, {
      lambdaArn: result.lambdaArn,
    });

    return {
      ...result,
      message: 'Lambda function deployed successfully',
    };
  }
}
