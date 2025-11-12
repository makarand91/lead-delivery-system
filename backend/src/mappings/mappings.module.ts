import { Module } from '@nestjs/common';
import { MappingsController } from './mappings.controller';
import { MappingsService } from './mappings.service';
import { AwsClientsService } from '../common/aws-clients.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MappingsController],
  providers: [MappingsService, AwsClientsService],
  exports: [MappingsService],
})
export class MappingsModule {}
