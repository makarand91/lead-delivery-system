import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DeliveriesService, Delivery } from './deliveries.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Deliveries')
@ApiBearerAuth()
@Controller('deliveries')
@UseGuards(AuthGuard)
export class DeliveriesController {
  constructor(private deliveriesService: DeliveriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new delivery' })
  async create(@Body() data: Partial<Delivery>, @Request() req): Promise<Delivery> {
    return this.deliveriesService.create({
      ...data,
      createdBy: req.user.sub,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get delivery by ID' })
  async findOne(@Param('id') id: string): Promise<Delivery> {
    return this.deliveriesService.findOne(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get deliveries by customer or status' })
  async find(
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
  ): Promise<Delivery[]> {
    if (customerId) {
      return this.deliveriesService.findByCustomer(customerId);
    }
    if (status) {
      return this.deliveriesService.findByStatus(status);
    }
    return [];
  }

  @Post('upload-url')
  @ApiOperation({ summary: 'Get pre-signed URL for file upload' })
  async getUploadUrl(
    @Body() body: { filename: string; customerId: string },
  ): Promise<{ uploadUrl: string; s3Key: string }> {
    return this.deliveriesService.getUploadUrl(body.filename, body.customerId);
  }
}
