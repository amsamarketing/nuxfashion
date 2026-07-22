import { Controller, Get, Post, Body, Req, Query, Param, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InventoryService } from './inventory.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';

@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get()
  getStock(
    @Req() req: Request,
    @Query('warehouse_id') warehouseId?: string,
    @Query('variant_id') variantId?: string,
  ) {
    return this.service.getStock((req.user as any).companyId, warehouseId, variantId);
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
  getMovements(
    @Req() req: Request,
    @Query('warehouse_id') warehouseId?: string,
    @Query('variant_id') variantId?: string,
  ) {
    return this.service.getMovements((req.user as any).companyId, warehouseId, variantId);
  }

  @Post('adjust')
  adjustStock(@Body() dto: AdjustStockDto, @Req() req: Request) {
    return this.service.adjustStock((req.user as any).companyId, (req.user as any).sub, dto);
  }

  @Get('warehouses')
  getWarehouses(@Req() req: Request) {
    return this.service.getWarehouses((req.user as any).companyId);
  }

  @Post('warehouses')
  createWarehouse(@Body() body: any, @Req() req: Request) {
    return this.service.createWarehouse((req.user as any).companyId, body);
  }

  @Get('warehouses/:id/stock')
  getWarehouseStock(@Req() req: Request, @Param('id') id: string) {
    return this.service.getWarehouseStock((req.user as any).companyId, id);
  }

  @Post('transfer')
  transferStock(@Body() dto: TransferStockDto, @Req() req: Request) {
    return this.service.transferStock((req.user as any).companyId, (req.user as any).sub, dto);
  }
  @Get('variants')
  getVariants(@Req() req: Request) {
    return this.service.getVariants((req.user as any).companyId);
  }

}
