import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { StoreCheckoutDto } from './dto/checkout.dto';

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
