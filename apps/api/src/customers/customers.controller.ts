import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { AddAddressDto } from './dto/add-address.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { AdjustLoyaltyDto } from './dto/adjust-loyalty.dto';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Post()
  create(@Body() dto: CreateCustomerDto, @Req() req: Request) {
    return this.service.create((req.user as any).companyId, dto);
  }
  @Get()
  findAll(@Req() req: Request, @Query('search') search?: string, @Query('tier') tier?: string) {
    return this.service.findAll((req.user as any).companyId, search, tier);
  }
  @Get('segments')
  getSegments(@Req() req: Request) {
    return this.service.getSegments((req.user as any).companyId);
  }
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.service.findOne((req.user as any).companyId, id);
  }
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @Req() req: Request) {
    return this.service.update((req.user as any).companyId, id, dto);
  }
  @Get(':id/orders')
  getOrderHistory(@Param('id') id: string, @Req() req: Request) {
    return this.service.getOrderHistory((req.user as any).companyId, id);
  }

  @Post(':id/addresses')
  addAddress(@Param('id') id: string, @Body() dto: AddAddressDto, @Req() req: Request) {
    return this.service.addAddress((req.user as any).companyId, id, dto);
  }
  @Get(':id/addresses')
  getAddresses(@Param('id') id: string, @Req() req: Request) {
    return this.service.getAddresses((req.user as any).companyId, id);
  }

  @Post(':id/interactions')
  addInteraction(@Param('id') id: string, @Body() dto: CreateInteractionDto, @Req() req: Request) {
    return this.service.addInteraction((req.user as any).companyId, (req.user as any).sub, id, dto);
  }
  @Get(':id/interactions')
  getInteractions(@Param('id') id: string, @Req() req: Request) {
    return this.service.getInteractions((req.user as any).companyId, id);
  }

  @Post(':id/loyalty')
  adjustLoyalty(@Param('id') id: string, @Body() dto: AdjustLoyaltyDto, @Req() req: Request) {
    return this.service.adjustLoyalty((req.user as any).companyId, (req.user as any).sub, id, dto);
  }
  @Get(':id/loyalty')
  getLoyaltyHistory(@Param('id') id: string, @Req() req: Request) {
    return this.service.getLoyaltyHistory((req.user as any).companyId, id);
  }
}
