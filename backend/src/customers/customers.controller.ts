import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService, Customer } from './customers.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
@UseGuards(AuthGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  async create(@Body() data: Partial<Customer>, @Request() req): Promise<Customer> {
    return this.customersService.create({
      ...data,
      createdBy: req.user.sub,
      teamId: req.user['custom:teamId'] || 'default-team',
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all customers for team' })
  async findAll(@Request() req): Promise<Customer[]> {
    const teamId = req.user['custom:teamId'] || 'default-team';
    return this.customersService.findByTeam(teamId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  async findOne(@Param('id') id: string): Promise<Customer> {
    return this.customersService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update customer' })
  async update(
    @Param('id') id: string,
    @Body() data: Partial<Customer>,
  ): Promise<Customer> {
    return this.customersService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete customer' })
  async delete(@Param('id') id: string): Promise<{ message: string }> {
    await this.customersService.delete(id);
    return { message: 'Customer deleted successfully' };
  }
}
