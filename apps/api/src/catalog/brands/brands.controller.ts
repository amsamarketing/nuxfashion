import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('catalog/brands')
export class BrandsController {
  constructor(private readonly service: BrandsService) {}

  @Get()
  findAll(@Req() req: Request) { return this.service.findAll((req.user as any).companyId); }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.service.findOne(id, (req.user as any).companyId);
  }

  @Post()
  create(@Body() dto: CreateBrandDto, @Req() req: Request) {
    return this.service.create(dto, (req.user as any).companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateBrandDto>, @Req() req: Request) {
    return this.service.update(id, dto, (req.user as any).companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.service.remove(id, (req.user as any).companyId);
  }
}
