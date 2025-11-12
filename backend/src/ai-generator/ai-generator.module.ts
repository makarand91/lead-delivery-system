import { Module } from '@nestjs/common';
import { AiGeneratorService } from './ai-generator.service';
import { AiGeneratorController } from './ai-generator.controller';
import { AwsClientsService } from '../common/aws-clients.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AiGeneratorController],
  providers: [AiGeneratorService, AwsClientsService],
  exports: [AiGeneratorService],
})
export class AiGeneratorModule {}
