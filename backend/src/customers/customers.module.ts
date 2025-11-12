import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { AwsClientsService } from '../common/aws-clients.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CustomersController],
  providers: [CustomersService, AwsClientsService],
  exports: [CustomersService],
})
export class CustomersModule {}
