import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiGeneratorService, GenerateIntegrationCodeRequest } from './ai-generator.service';
import { AuthGuard } from '../common/auth.guard';
import { IntegrationCodeService } from '../integration-code/integration-code.service';

@ApiTags('AI Generator')
@ApiBearerAuth()
@Controller('ai-generator')
@UseGuards(AuthGuard)
export class AiGeneratorController {
  constructor(
    private aiGeneratorService: AiGeneratorService,
    private integrationCodeService: IntegrationCodeService,
  ) {}

  @Post('integration-code')
  @ApiOperation({ summary: 'Generate CRM integration code using AI' })
  async generateIntegrationCode(
    @Body() request: GenerateIntegrationCodeRequest & { customerId: string },
  ): Promise<{ code: string; codeId: string }> {
    const code = await this.aiGeneratorService.generateIntegrationCode(request);

    // Save the generated code
    const savedCode = await this.integrationCodeService.saveGeneratedCode({
      customerId: request.customerId,
      code,
      crmType: request.crmType,
      crmEndpoint: request.crmEndpoint,
    });

    return { code, codeId: savedCode.codeId };
  }

  @Post('transformation-function')
  @ApiOperation({ summary: 'Generate custom transformation function using AI' })
  async generateTransformationFunction(
    @Body() body: { description: string },
  ): Promise<{ code: string }> {
    const code = await this.aiGeneratorService.generateTransformationFunction(body.description);
    return { code };
  }
}
