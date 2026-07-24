import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { B2bService } from './b2b.service';
@UseGuards(JwtAuthGuard) @Controller('b2b')
export class B2bController {
  constructor(private readonly service:B2bService){}
  @Get('orders') list(@Req() req:Request,@Query('status') status?:string,@Query('search') search?:string){return this.service.list((req.user as any).companyId,status,search)}
  @Get('orders/:id') detail(@Req() req:Request,@Param('id') id:string){return this.service.detail((req.user as any).companyId,id)}
  @Get('catalog') catalog(@Req() req:Request,@Query('warehouse_id') warehouseId:string,@Query('search') search?:string){return this.service.catalog((req.user as any).companyId,warehouseId,search)}
  @Post('orders') create(@Req() req:Request,@Body() body:any){return this.service.create((req.user as any).companyId,(req.user as any).sub,body)}
  @Patch('orders/:id/status') status(@Req() req:Request,@Param('id') id:string,@Body() body:any){return this.service.changeStatus((req.user as any).companyId,(req.user as any).sub,id,body.status)}
  @Post('orders/:id/payments') payment(@Req() req:Request,@Param('id') id:string,@Body() body:any){return this.service.addPayment((req.user as any).companyId,(req.user as any).sub,id,body)}
}
