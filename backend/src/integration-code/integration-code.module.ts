import { Module } from '@nestjs/common';
import { IntegrationCodeController } from './integration-code.controller';
import { IntegrationCodeService } from './integration-code.service';
import { AwsClientsService } from '../common/aws-clients.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [IntegrationCodeController],
  providers: [IntegrationCodeService, AwsClientsService],
  exports: [IntegrationCodeService],
})
export class IntegrationCodeModule {}
