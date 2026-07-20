import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  getStock(@Req() req: Request, @Query() query: any) {
    return this.service.getStock((req.user as any).companyId, query);
  }

  @Get('summary')
  getSummary(@Req() req: Request) {
    return this.service.getSummary((req.user as any).companyId);
  }

  @Get('low-stock')
  getLowStock(@Req() req: Request) {
    return this.service.getLowStock((req.user as any).companyId);
  }

  @Get('movements')
  getMovements(@Req() req: Request, @Query() query: any) {
    return this.service.getMovements((req.user as any).companyId, query);
  }

  @Post('adjust')
  adjustStock(@Body() dto: AdjustStockDto, @Req() req: Request) {
    return this.service.adjustStock((req.user as any).companyId, (req.user as any).sub, dto);
  }

  @Post('transfer')
  transferStock(@Body() dto: TransferStockDto, @Req() req: Request) {
    return this.service.transferStock((req.user as any).companyId, (req.user as any).sub, dto);
  }
}
