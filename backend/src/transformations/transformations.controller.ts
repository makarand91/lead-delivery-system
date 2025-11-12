import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransformationsService } from './transformations.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Transformations')
@ApiBearerAuth()
@Controller('transformations')
@UseGuards(AuthGuard)
export class TransformationsController {
  constructor(private transformationsService: TransformationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all built-in transformation functions' })
  getTransformations() {
    return {
      transformations: this.transformationsService.getBuiltInTransformations(),
    };
  }

  @Post('apply')
  @ApiOperation({ summary: 'Test apply transformation to a value' })
  applyTransformation(
    @Body() body: { transformationName: string; value: any; params?: any },
  ) {
    const result = this.transformationsService.applyTransformation(
      body.transformationName,
      body.value,
      body.params,
    );
    return { original: body.value, transformed: result };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate custom transformation code' })
  validateCode(@Body() body: { code: string }) {
    return this.transformationsService.validateTransformationCode(body.code);
  }
}
