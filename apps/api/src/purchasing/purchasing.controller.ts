import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PurchasingService } from './purchasing.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreatePODto } from './dto/create-po.dto';
import { ReceiveGoodsDto } from './dto/receive-goods.dto';

@UseGuards(JwtAuthGuard)
@Controller('purchasing')
export class PurchasingController {
  constructor(private readonly service: PurchasingService) {}

  @Post('suppliers')
  createSupplier(@Body() dto: CreateSupplierDto, @Req() req: Request) {
    return this.service.createSupplier((req.user as any).companyId, dto);
  }
  @Get('suppliers')
  getSuppliers(@Req() req: Request) {
    return this.service.getSuppliers((req.user as any).companyId);
  }
  @Get('suppliers/:id')
  getSupplier(@Param('id') id: string, @Req() req: Request) {
    return this.service.getSupplier((req.user as any).companyId, id);
  }

  @Post('orders')
  createPO(@Body() dto: CreatePODto, @Req() req: Request) {
    return this.service.createPO((req.user as any).companyId, (req.user as any).sub, dto);
  }
  @Get('orders')
  getPOs(@Req() req: Request, @Query('status') status?: string) {
    return this.service.getPOs((req.user as any).companyId, status);
  }
  @Get('orders/:id')
  getPO(@Param('id') id: string, @Req() req: Request) {
    return this.service.getPO((req.user as any).companyId, id);
  }
  @Patch('orders/:id/approve')
  approvePO(@Param('id') id: string, @Req() req: Request) {
    return this.service.approvePO((req.user as any).companyId, (req.user as any).sub, id);
  }
  @Patch('orders/:id/cancel')
  cancelPO(@Param('id') id: string, @Req() req: Request) {
    return this.service.cancelPO((req.user as any).companyId, id);
  }

  @Post('receive')
  receiveGoods(@Body() dto: ReceiveGoodsDto, @Req() req: Request) {
    return this.service.receiveGoods((req.user as any).companyId, (req.user as any).sub, dto);
  }
  @Get('receipts')
  getGRNs(@Req() req: Request) {
    return this.service.getGRNs((req.user as any).companyId);
  }
  @Post('orders/:id/payments')
  recordPayment(@Param('id') id:string,@Body() body:any,@Req() req:Request){
    return this.service.recordPayment((req.user as any).companyId,(req.user as any).sub,id,body);
  }
  @Post('orders/:id/returns')
  createReturn(@Param('id') id:string,@Body() body:any,@Req() req:Request){
    return this.service.createReturn((req.user as any).companyId,(req.user as any).sub,id,body);
  }
  @Patch('suppliers/:id')
  updateSupplier(@Param('id') id: string, @Body() dto: any, @Req() req: Request) {
    return this.service.updateSupplier((req.user as any).companyId, id, dto);
  }

  @Delete('suppliers/:id')
  deleteSupplier(@Param('id') id: string, @Req() req: Request) {
    return this.service.deleteSupplier((req.user as any).companyId, id);
  }

}
