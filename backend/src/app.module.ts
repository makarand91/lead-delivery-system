import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CustomersModule } from './customers/customers.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { MappingsModule } from './mappings/mappings.module';
import { AiGeneratorModule } from './ai-generator/ai-generator.module';
import { LambdaDeployerModule } from './lambda-deployer/lambda-deployer.module';
import { ExcelParserModule } from './excel-parser/excel-parser.module';
import { LogsModule } from './logs/logs.module';
import { TransformationsModule } from './transformations/transformations.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    CustomersModule,
    DeliveriesModule,
    MappingsModule,
    AiGeneratorModule,
    LambdaDeployerModule,
    ExcelParserModule,
    LogsModule,
    TransformationsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
