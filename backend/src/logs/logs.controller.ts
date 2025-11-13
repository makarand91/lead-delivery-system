import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LogsService, DeliveryLog } from './logs.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Logs')
@ApiBearerAuth()
@Controller('logs')
@UseGuards(AuthGuard)
export class LogsController {
  constructor(private logsService: LogsService) {}

  @Get('delivery/:deliveryId')
  @ApiOperation({ summary: 'Get logs for a delivery' })
  async findByDelivery(@Param('deliveryId') deliveryId: string): Promise<DeliveryLog[]> {
    return this.logsService.findByDelivery(deliveryId);
  }

  @Get('delivery/:deliveryId/failed')
  @ApiOperation({ summary: 'Get failed leads for a delivery' })
  async findFailedLeads(@Param('deliveryId') deliveryId: string): Promise<DeliveryLog[]> {
    return this.logsService.findFailedLeads(deliveryId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search logs using ElasticSearch' })
  async searchLogs(@Query('q') query: string): Promise<any[]> {
    return this.logsService.searchLogs(query);
  }
}
