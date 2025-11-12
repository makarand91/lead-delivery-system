import { Module } from '@nestjs/common';
import { LambdaDeployerService } from './lambda-deployer.service';
import { LambdaDeployerController } from './lambda-deployer.controller';
import { AwsClientsService } from '../common/aws-clients.service';
import { AuthModule } from '../auth/auth.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [AuthModule, CustomersModule],
  controllers: [LambdaDeployerController],
  providers: [LambdaDeployerService, AwsClientsService],
  exports: [LambdaDeployerService],
})
export class LambdaDeployerModule {}
