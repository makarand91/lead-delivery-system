import { Module } from '@nestjs/common';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import { AwsClientsService } from '../common/aws-clients.service';
import { ExcelParserModule } from '../excel-parser/excel-parser.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, ExcelParserModule],
  controllers: [DeliveriesController],
  providers: [DeliveriesService, AwsClientsService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
