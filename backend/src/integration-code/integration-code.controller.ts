import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IntegrationCodeService, IntegrationCode } from './integration-code.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Integration Code')
@Controller('integration-code')
@UseGuards(AuthGuard)
export class IntegrationCodeController {
  constructor(private integrationCodeService: IntegrationCodeService) {}

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get all integration code versions for a customer' })
  async getByCustomer(@Param('customerId') customerId: string): Promise<IntegrationCode[]> {
    return this.integrationCodeService.getCodesByCustomer(customerId);
  }

  @Get('customer/:customerId/latest')
  @ApiOperation({ summary: 'Get latest integration code for a customer' })
  async getLatest(@Param('customerId') customerId: string): Promise<IntegrationCode | null> {
    return this.integrationCodeService.getLatestCode(customerId);
  }

  @Get(':codeId')
  @ApiOperation({ summary: 'Get integration code by ID' })
  async getById(@Param('codeId') codeId: string): Promise<IntegrationCode> {
    return this.integrationCodeService.getCodeById(codeId);
  }

  @Get(':codeId/from-s3')
  @ApiOperation({ summary: 'Get integration code from S3' })
  async getFromS3(@Param('codeId') codeId: string): Promise<{ code: string }> {
    const integrationCode = await this.integrationCodeService.getCodeById(codeId);
    if (!integrationCode.s3Key) {
      return { code: integrationCode.code };
    }
    const code = await this.integrationCodeService.getCodeFromS3(integrationCode.s3Key);
    return { code };
  }
}
