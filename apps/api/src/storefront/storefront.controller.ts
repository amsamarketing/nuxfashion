import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { StorefrontService } from './storefront.service';
import { StoreCheckoutDto } from './dto/checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('storefront')
export class StorefrontController {
  constructor(private readonly service: StorefrontService) {}

  @Get('config')
  config() { return this.service.getConfig(); }

  @Get('catalog')
  catalog(@Query('search') search?: string,@Query('category') category?: string) {
    return this.service.getCatalog(search,category);
  }

  @Get('products/:id')
  product(@Param('id') id:string) { return this.service.getProduct(id); }

  @Post('checkout')
  checkout(@Body() dto:StoreCheckoutDto) { return this.service.checkout(dto); }
}

@UseGuards(JwtAuthGuard)
@Controller('storefront/admin')
export class StorefrontAdminController {
  constructor(private readonly service:StorefrontService) {}
  @Get('content') content(@Req() req:Request){return this.service.getAdminContent((req.user as any).companyId)}
  @Patch('settings') settings(@Body() body:any,@Req() req:Request){return this.service.updateSettings((req.user as any).companyId,body)}
  @Post('banners') createBanner(@Body() body:any,@Req() req:Request){return this.service.createBanner((req.user as any).companyId,body)}
  @Patch('banners/:id') updateBanner(@Param('id') id:string,@Body() body:any,@Req() req:Request){return this.service.updateBanner((req.user as any).companyId,id,body)}
  @Delete('banners/:id') deleteBanner(@Param('id') id:string,@Req() req:Request){return this.service.deleteBanner((req.user as any).companyId,id)}
}
