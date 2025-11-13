import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { DeliveriesService, Delivery } from './deliveries.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Deliveries')
@ApiBearerAuth()
@Controller('deliveries')
@UseGuards(AuthGuard)
export class DeliveriesController {
  constructor(private deliveriesService: DeliveriesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload Excel file and create delivery' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('customerId') customerId: string,
    @Body('mappingId') mappingId: string,
    @Body('scheduledAt') scheduledAt: string,
    @Request() req,
  ): Promise<{ s3Key: string; headers: string[]; message: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!customerId) {
      throw new BadRequestException('customerId is required');
    }

    // Upload file to S3
    const s3Key = await this.deliveriesService.uploadFileToS3(
      file.buffer,
      file.originalname,
      customerId,
    );

    // Also parse Excel headers for field mapping
    const headers = await this.deliveriesService.getExcelHeaders(s3Key);

    return {
      s3Key,
      headers,
      message: 'File uploaded successfully',
    };
  }

  @Post('parse-headers')
  @ApiOperation({ summary: 'Get Excel file headers for field mapping' })
  async getHeaders(@Body('s3Key') s3Key: string): Promise<{ headers: string[] }> {
    const headers = await this.deliveriesService.getExcelHeaders(s3Key);
    return { headers };
  }

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
    @Query('limit') limit?: string,
  ): Promise<Delivery[]> {
    const filters: any = {};
    if (customerId) filters.customerId = customerId;
    if (status) filters.status = status;
    if (limit) filters.limit = parseInt(limit, 10);

    const result = await this.deliveriesService.getGlobalDeliveriesView(filters);
    return result.deliveries;
  }

  @Post('upload-url')
  @ApiOperation({ summary: 'Get pre-signed URL for file upload' })
  async getUploadUrl(
    @Body() body: { filename: string; customerId: string },
  ): Promise<{ uploadUrl: string; s3Key: string }> {
    return this.deliveriesService.getUploadUrl(body.filename, body.customerId);
  }

  @Get('global/view')
  @ApiOperation({ summary: 'Get global deliveries view with summary statistics' })
  async getGlobalView(
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.deliveriesService.getGlobalDeliveriesView({
      status,
      customerId,
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : undefined,
    });
  }
}
