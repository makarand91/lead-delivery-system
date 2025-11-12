import { Module } from '@nestjs/common';
import { ExcelParserService } from './excel-parser.service';
import { AwsClientsService } from '../common/aws-clients.service';

@Module({
  providers: [ExcelParserService, AwsClientsService],
  exports: [ExcelParserService],
})
export class ExcelParserModule {}
