import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { AwsClientsService } from '../common/aws-clients.service';
import { OpenSearchClientService } from '../common/opensearch-client.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [LogsController],
  providers: [LogsService, AwsClientsService, OpenSearchClientService],
  exports: [LogsService],
})
export class LogsModule {}
