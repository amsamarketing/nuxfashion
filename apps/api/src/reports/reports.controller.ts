import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  private cid(req: Request) { return (req.user as any).companyId; }

  // ── Dashboard ──────────────────────────────────────────────────────────────
  @Get('dashboard')
  getDashboard(@Req() req: Request) {
    return this.service.getDashboard(this.cid(req));
  }

  // ── Sales ──────────────────────────────────────────────────────────────────
  @Get('sales/by-period')
  getSalesByPeriod(
    @Req() req: Request,
    @Query('group_by') groupBy = 'day',
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getSalesByPeriod(this.cid(req), groupBy, from, to); }

  @Get('sales/by-branch')
  getSalesByBranch(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getSalesByBranch(this.cid(req), from, to); }

  @Get('sales/by-staff')
  getSalesByStaff(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getSalesByStaff(this.cid(req), from, to); }

  @Get('sales/by-category')
  getSalesByCategory(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getSalesByCategory(this.cid(req), from, to); }

  @Get('sales/by-brand')
  getSalesByBrand(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getSalesByBrand(this.cid(req), from, to); }

  @Get('sales/by-product')
  getSalesByProduct(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('limit') limit = '20',
  ) { return this.service.getSalesByProduct(this.cid(req), from, to, parseInt(limit)); }

  @Get('sales/hourly-heatmap')
  getHourlyHeatmap(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getHourlyHeatmap(this.cid(req), from, to); }

  @Get('sales/by-channel')
  getSalesByChannel(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getSalesByChannel(this.cid(req), from, to); }

  @Get('sales/discount-impact')
  getDiscountImpact(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getDiscountImpact(this.cid(req), from, to); }

  @Get('sales/payments')
  getPaymentMethods(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getPaymentMethodBreakdown(this.cid(req), from, to); }

  // ── Inventory ──────────────────────────────────────────────────────────────
  @Get('inventory/stock-on-hand')
  getStockOnHand(@Req() req: Request) {
    return this.service.getStockOnHand(this.cid(req));
  }

  @Get('inventory/valuation')
  getInventoryValuation(@Req() req: Request) {
    return this.service.getInventoryValuation(this.cid(req));
  }

  @Get('inventory/low-stock')
  getLowStock(@Req() req: Request) {
    return this.service.getLowStockReport(this.cid(req));
  }

  @Get('inventory/movements')
  getStockMovements(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('variant_id') variantId?: string,
  ) { return this.service.getStockMovementReport(this.cid(req), from, to, variantId); }

  @Get('inventory/dead-stock')
  getDeadStock(
    @Req() req: Request,
    @Query('days') days = '90',
  ) { return this.service.getDeadStock(this.cid(req), parseInt(days)); }

  @Get('inventory/transfers')
  getTransferHistory(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getTransferHistory(this.cid(req), from, to); }

  @Get('inventory/reorder-suggestions')
  getReorderSuggestions(@Req() req: Request) {
    return this.service.getReorderSuggestions(this.cid(req));
  }

  // ── Finance ────────────────────────────────────────────────────────────────
  @Get('finance/pnl')
  getPnL(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getPnL(this.cid(req), from, to); }

  @Get('finance/vat-return')
  getVatReturn(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getVatReturn(this.cid(req), from, to); }

  @Get('finance/bnpl-settlement')
  getBnplSettlement(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getBnplSettlement(this.cid(req), from, to); }

  @Get('finance/cash-flow')
  getCashFlow(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getCashFlow(this.cid(req), from, to); }

  @Get('finance/bank-reconciliation')
  getBankReconciliation(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getBankReconciliation(this.cid(req), from, to); }

  // ── Customers ──────────────────────────────────────────────────────────────
  @Get('customers')
  getCustomerReport(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getCustomerReport(this.cid(req), from, to); }

  @Get('customers/clv')
  getCustomerCLV(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getCustomerCLV(this.cid(req), from, to); }

  @Get('customers/new-vs-returning')
  getNewVsReturning(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getNewVsReturning(this.cid(req), from, to); }

  @Get('customers/loyalty')
  getLoyaltyReport(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getLoyaltyReport(this.cid(req), from, to); }

  @Get('customers/rfm')
  getRfmSegmentation(@Req() req: Request) {
    return this.service.getRfmSegmentation(this.cid(req));
  }

  @Get('customers/cohort-retention')
  getCohortRetention(@Req() req: Request) {
    return this.service.getCohortRetention(this.cid(req));
  }

  @Get('customers/churn-risk')
  getChurnRisk(@Req() req: Request) {
    return this.service.getChurnRisk(this.cid(req));
  }

  // ── Products ───────────────────────────────────────────────────────────────
  @Get('products/best-sellers-by-branch')
  getBestSellersByBranch(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getBestSellersByBranch(this.cid(req), from, to); }

  @Get('products/gross-margin')
  getGrossMarginByProduct(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getGrossMarginByProduct(this.cid(req), from, to); }

  @Get('products/return-rate')
  getReturnRateBySku(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getReturnRateBySku(this.cid(req), from, to); }

  @Get('products/markdown')
  getMarkdownReport(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getMarkdownReport(this.cid(req), from, to); }

  @Get('products/bundle-performance')
  getBundlePerformance(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getBundlePerformance(this.cid(req), from, to); }

  @Get('products/price-sensitivity')
  getPriceSensitivity(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getPriceSensitivity(this.cid(req), from, to); }

  // ── HR ─────────────────────────────────────────────────────────────────────
  @Get('hr')
  getHrReport(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getHrReport(this.cid(req), from, to); }

  @Get('hr/attendance')
  getAttendanceSummary(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getAttendanceSummary(this.cid(req), from, to); }

  @Get('hr/payroll-breakdown')
  getPayrollBreakdown(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getPayrollBreakdown(this.cid(req), from, to); }

  @Get('hr/commission')
  getCommissionReport(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getCommissionReport(this.cid(req), from, to); }

  @Get('hr/top-performers')
  getTopPerformers(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getTopPerformers(this.cid(req), from, to); }

  @Get('hr/gosi')
  getGosiReport(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getGosiReport(this.cid(req), from, to); }

  @Get('hr/wps')
  getWpsLog(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getWpsLog(this.cid(req), from, to); }

  // ── Purchasing ─────────────────────────────────────────────────────────────
  @Get('purchasing')
  getPurchasingReport(
    @Req() req: Request,
    @Query('from') from: string,
    @Query('to') to: string,
  ) { return this.service.getPurchasingReport(this.cid(req), from, to); }
}
