import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FinanceService } from './finance.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';

@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  @Post('accounts')
  createAccount(@Body() dto: CreateAccountDto, @Req() req: Request) {
    return this.service.createAccount((req.user as any).companyId, dto);
  }
  @Get('accounts')
  getAccounts(@Req() req: Request, @Query('type') type?: string) {
    return this.service.getAccounts((req.user as any).companyId, type);
  }

  @Post('journal')
  createJournalEntry(@Body() dto: CreateJournalEntryDto, @Req() req: Request) {
    return this.service.createJournalEntry((req.user as any).companyId, (req.user as any).sub, dto);
  }
  @Get('journal')
  getJournalEntries(@Req() req: Request, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.getJournalEntries((req.user as any).companyId, from, to);
  }
  @Get('journal/:id')
  getJournalEntry(@Param('id') id: string, @Req() req: Request) {
    return this.service.getJournalEntry((req.user as any).companyId, id);
  }

  @Post('expense-categories')
  createExpenseCategory(@Body() dto: CreateExpenseCategoryDto, @Req() req: Request) {
    return this.service.createExpenseCategory((req.user as any).companyId, dto);
  }
  @Get('expense-categories')
  getExpenseCategories(@Req() req: Request) {
    return this.service.getExpenseCategories((req.user as any).companyId);
  }

  @Post('expenses')
  createExpense(@Body() dto: CreateExpenseDto, @Req() req: Request) {
    return this.service.createExpense((req.user as any).companyId, (req.user as any).sub, dto);
  }
  @Get('expenses')
  getExpenses(@Req() req: Request, @Query('from') from?: string,
    @Query('to') to?: string, @Query('category_id') cat?: string) {
    return this.service.getExpenses((req.user as any).companyId, from, to, cat);
  }

  @Get('reports/profit-loss')
  getProfitLoss(@Req() req: Request, @Query('from') from: string, @Query('to') to: string) {
    return this.service.getProfitLoss((req.user as any).companyId, from, to);
  }
  @Get('reports/vat')
  getVatReport(@Req() req: Request, @Query('from') from: string, @Query('to') to: string) {
    return this.service.getVatReport((req.user as any).companyId, from, to);
  }
  @Get('reports/balance-sheet')
  getBalanceSheet(@Req() req: Request) {
    return this.service.getBalanceSheet((req.user as any).companyId);
  }
  @Get('reports/cash-flow')
  getCashFlow(@Req() req: Request, @Query('from') from: string, @Query('to') to: string) {
    return this.service.getCashFlow((req.user as any).companyId, from, to);
  }
}
