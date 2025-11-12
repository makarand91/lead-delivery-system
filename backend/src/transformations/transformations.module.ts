import { Module } from '@nestjs/common';
import { TransformationsService } from './transformations.service';
import { TransformationsController } from './transformations.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TransformationsController],
  providers: [TransformationsService],
  exports: [TransformationsService],
})
export class TransformationsModule {}
