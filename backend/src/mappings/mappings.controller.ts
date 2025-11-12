import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MappingsService, Mapping } from './mappings.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Mappings')
@ApiBearerAuth()
@Controller('mappings')
@UseGuards(AuthGuard)
export class MappingsController {
  constructor(private mappingsService: MappingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new field mapping' })
  async create(@Body() data: Partial<Mapping>): Promise<Mapping> {
    return this.mappingsService.create(data);
  }

  @Get()
  @ApiOperation({ summary: 'Get mappings by customer' })
  async findByCustomer(@Query('customerId') customerId: string): Promise<Mapping[]> {
    return this.mappingsService.findByCustomer(customerId);
  }

  @Get(':mappingId')
  @ApiOperation({ summary: 'Get mapping by ID' })
  async findOne(
    @Query('customerId') customerId: string,
    @Param('mappingId') mappingId: string,
  ): Promise<Mapping> {
    return this.mappingsService.findOne(customerId, mappingId);
  }

  @Put(':mappingId')
  @ApiOperation({ summary: 'Update mapping' })
  async update(
    @Query('customerId') customerId: string,
    @Param('mappingId') mappingId: string,
    @Body() data: Partial<Mapping>,
  ): Promise<Mapping> {
    return this.mappingsService.update(customerId, mappingId, data);
  }

  @Delete(':mappingId')
  @ApiOperation({ summary: 'Delete mapping' })
  async delete(
    @Query('customerId') customerId: string,
    @Param('mappingId') mappingId: string,
  ): Promise<{ message: string }> {
    await this.mappingsService.delete(customerId, mappingId);
    return { message: 'Mapping deleted successfully' };
  }
}
