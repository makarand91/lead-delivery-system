import { Module } from '@nestjs/common';
import { IntegrationCodeController } from './integration-code.controller';
import { IntegrationCodeService } from './integration-code.service';
import { AwsClientsModule } from '../common/aws-clients.module';

@Module({
  imports: [AwsClientsModule],
  controllers: [IntegrationCodeController],
  providers: [IntegrationCodeService],
  exports: [IntegrationCodeService],
})
export class IntegrationCodeModule {}
