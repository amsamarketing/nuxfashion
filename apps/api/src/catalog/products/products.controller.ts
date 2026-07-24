import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto, CreateVariantDto } from './dto/create-product.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('catalog/products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  findAll(@Req() req: Request, @Query() query: any) {
    return this.service.findAll((req.user as any).companyId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.service.findOne(id, (req.user as any).companyId);
  }

  @Post()
  create(@Body() dto: CreateProductDto, @Req() req: Request) {
    return this.service.create(dto, (req.user as any).companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateProductDto>, @Req() req: Request) {
    return this.service.update(id, dto, (req.user as any).companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.service.remove(id, (req.user as any).companyId);
  }

  @Post(':id/variants')
  addVariant(@Param('id') id: string, @Body() dto: CreateVariantDto, @Req() req: Request) {
    return this.service.addVariant(id, dto, (req.user as any).companyId);
  }

  @Patch('variants/:variantId')
  updateVariant(@Param('variantId') variantId: string, @Body() dto: Partial<CreateVariantDto>, @Req() req: Request) {
    return this.service.updateVariant(variantId, dto, (req.user as any).companyId);
  }

  @Delete('variants/:variantId')
  removeVariant(@Param('variantId') variantId: string, @Req() req: Request) {
    return this.service.removeVariant(variantId, (req.user as any).companyId);
  }
}
