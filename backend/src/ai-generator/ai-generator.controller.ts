import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiGeneratorService, GenerateIntegrationCodeRequest } from './ai-generator.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('AI Generator')
@ApiBearerAuth()
@Controller('ai-generator')
@UseGuards(AuthGuard)
export class AiGeneratorController {
  constructor(private aiGeneratorService: AiGeneratorService) {}

  @Post('integration-code')
  @ApiOperation({ summary: 'Generate CRM integration code using AI' })
  async generateIntegrationCode(
    @Body() request: GenerateIntegrationCodeRequest,
  ): Promise<{ code: string }> {
    const code = await this.aiGeneratorService.generateIntegrationCode(request);
    return { code };
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
