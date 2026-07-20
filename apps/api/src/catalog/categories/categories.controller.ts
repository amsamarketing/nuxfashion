import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('catalog/categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  findAll(@Req() req: Request) {
    return this.service.findAll((req.user as any).companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request) {
    return this.service.findOne(id, (req.user as any).companyId);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto, @Req() req: Request) {
    return this.service.create(dto, (req.user as any).companyId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateCategoryDto>, @Req() req: Request) {
    return this.service.update(id, dto, (req.user as any).companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.service.remove(id, (req.user as any).companyId);
  }
}
