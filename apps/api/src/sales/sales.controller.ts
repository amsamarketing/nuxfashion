import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SalesService } from './sales.service';
import { OpenSessionDto } from './dto/open-session.dto';
import { CloseSessionDto } from './dto/close-session.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { CreateReturnDto } from './dto/create-return.dto';
import { CreateDiscountDto } from './dto/create-discount.dto';

@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly service: SalesService) {}

  @Post('sessions/open')
  openSession(@Body() dto: OpenSessionDto, @Req() req: Request) {
    return this.service.openSession((req.user as any).companyId, (req.user as any).sub, dto);
  }
  @Post('sessions/:id/close')
  closeSession(@Param('id') id: string, @Body() dto: CloseSessionDto, @Req() req: Request) {
    return this.service.closeSession((req.user as any).companyId, (req.user as any).sub, id, dto);
  }
  @Get('sessions/current')
  getCurrentSession(@Req() req: Request) {
    return this.service.getCurrentSession((req.user as any).companyId, (req.user as any).sub);
  }
  @Get('sessions/:id/report')
  getSessionReport(@Param('id') id: string, @Req() req: Request) {
    return this.service.getSessionReport((req.user as any).companyId, id);
  }
  @Get('sessions')
  getSessions(@Req() req: Request) {
    return this.service.getSessions((req.user as any).companyId);
  }

  @Post('discounts')
  createDiscount(@Body() dto: CreateDiscountDto, @Req() req: Request) {
    return this.service.createDiscount((req.user as any).companyId, dto);
  }
  @Get('discounts')
  getDiscounts(@Req() req: Request) {
    return this.service.getDiscounts((req.user as any).companyId);
  }
  @Get('discounts/report')
  getDiscountReport(@Req() req: Request) {
    return this.service.getDiscountReport((req.user as any).companyId);
  }
  @Patch('discounts/:id')
  updateDiscount(@Param('id') id: string, @Body() dto: Partial<CreateDiscountDto>, @Req() req: Request) {
    return this.service.updateDiscount((req.user as any).companyId, id, dto);
  }
  @Get('discounts/validate-coupon')
  validateCoupon(@Query('code') code: string, @Query('amount') amount: string, @Query('customer_id') customerId: string, @Req() req: Request) {
    return this.service.validateCoupon((req.user as any).companyId, code, parseFloat(amount), customerId||undefined);
  }
  @Get('gift-cards')
  getGiftCards(@Req() req: Request) {
    return this.service.getGiftCards((req.user as any).companyId);
  }
  @Post('gift-cards')
  createGiftCard(@Body() dto: any, @Req() req: Request) {
    return this.service.createGiftCard((req.user as any).companyId, (req.user as any).sub, dto);
  }
  @Patch('gift-cards/:id')
  updateGiftCard(@Param('id') id: string, @Body() dto: any, @Req() req: Request) {
    return this.service.updateGiftCard((req.user as any).companyId, id, dto);
  }

  @Post('orders')
  createOrder(@Body() dto: CreateOrderDto, @Req() req: Request) {
    return this.service.createOrder((req.user as any).companyId, (req.user as any).sub, dto);
  }
  @Get('orders')
  getOrders(@Req() req: Request, @Query('status') status?: string) {
    return this.service.getOrders((req.user as any).companyId, status);
  }
  @Get('orders/:id')
  getOrder(@Param('id') id: string, @Req() req: Request) {
    return this.service.getOrder((req.user as any).companyId, id);
  }
  @Patch('orders/:id/cancel')
  cancelOrder(@Param('id') id: string, @Req() req: Request) {
    return this.service.cancelOrder((req.user as any).companyId, (req.user as any).sub, id);
  }
  @Patch('orders/:id/workflow')
  updateOrderWorkflow(@Param('id') id: string, @Body() dto: any, @Req() req: Request) {
    return this.service.updateOrderWorkflow((req.user as any).companyId, (req.user as any).sub, id, dto);
  }

  @Post('payments')
  processPayment(@Body() dto: ProcessPaymentDto, @Req() req: Request) {
    return this.service.processPayment((req.user as any).companyId, dto);
  }

  @Post('returns')
  createReturn(@Body() dto: CreateReturnDto, @Req() req: Request) {
    return this.service.createReturn((req.user as any).companyId, (req.user as any).sub, dto);
  }
  @Get('returns')
  getReturns(@Req() req: Request) {
    return this.service.getReturns((req.user as any).companyId);
  }
}
