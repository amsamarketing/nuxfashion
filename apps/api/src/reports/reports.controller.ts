import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('dashboard')
  getDashboard(@Req() req: Request) {
    return this.service.getDashboard((req.user as any).companyId);
  }
  @Get('business-performance')
  getBusinessPerformance(@Req() req: Request,@Query('from') from:string,@Query('to') to:string) {
    return this.service.getBusinessPerformance((req.user as any).companyId,from,to);
  }

  // Sales
  @Get('sales/by-period')
  getSalesByPeriod(@Req() req: Request,
    @Query('group_by') groupBy = 'day',
    @Query('from') from: string, @Query('to') to: string) {
    return this.service.getSalesByPeriod((req.user as any).companyId, groupBy, from, to);
  }
  @Get('sales/by-product')
  getSalesByProduct(@Req() req: Request,
    @Query('from') from: string, @Query('to') to: string,
    @Query('limit') limit?: string) {
    return this.service.getSalesByProduct((req.user as any).companyId, from, to, limit ? parseInt(limit) : 20);
  }
  @Get('sales/by-category')
  getSalesByCategory(@Req() req: Request, @Query('from') from: string, @Query('to') to: string) {
    return this.service.getSalesByCategory((req.user as any).companyId, from, to);
  }
  @Get('sales/by-staff')
  getSalesByStaff(@Req() req: Request, @Query('from') from: string, @Query('to') to: string) {
    return this.service.getSalesByStaff((req.user as any).companyId, from, to);
  }
  @Get('sales/payments')
  getPaymentMethodBreakdown(@Req() req: Request, @Query('from') from: string, @Query('to') to: string) {
    return this.service.getPaymentMethodBreakdown((req.user as any).companyId, from, to);
  }

  // Inventory
  @Get('inventory/valuation')
  getInventoryValuation(@Req() req: Request) {
    return this.service.getInventoryValuation((req.user as any).companyId);
  }
  @Get('inventory/low-stock')
  getLowStockReport(@Req() req: Request) {
    return this.service.getLowStockReport((req.user as any).companyId);
  }
  @Get('inventory/movements')
  getStockMovements(@Req() req: Request,
    @Query('from') from: string, @Query('to') to: string,
    @Query('variant_id') variantId?: string) {
    return this.service.getStockMovementReport((req.user as any).companyId, from, to, variantId);
  }

  // Customers
  @Get('customers')
  getCustomerReport(@Req() req: Request, @Query('from') from: string, @Query('to') to: string) {
    return this.service.getCustomerReport((req.user as any).companyId, from, to);
  }

  // Purchasing
  @Get('purchasing')
  getPurchasingReport(@Req() req: Request, @Query('from') from: string, @Query('to') to: string) {
    return this.service.getPurchasingReport((req.user as any).companyId, from, to);
  }

  // HR
  @Get('hr')
  getHrReport(@Req() req: Request, @Query('from') from: string, @Query('to') to: string) {
    return this.service.getHrReport((req.user as any).companyId, from, to);
  }
}
