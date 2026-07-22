import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';

@Injectable()
export class InventoryService {
  constructor(private db: DatabaseService) {}

  async getStock(companyId: string, warehouseId?: string, variantId?: string) {
    const conditions = ['p.company_id = $1'];
    const params: any[] = [companyId];
    let idx = 2;
    if (warehouseId) { conditions.push(`i.warehouse_id = $${idx++}`); params.push(warehouseId); }
    if (variantId)   { conditions.push(`i.variant_id = $${idx++}`);   params.push(variantId); }
    const result = await this.db.query(
      `SELECT i.id, i.warehouse_id, w.name as warehouse_name,
              i.variant_id, pv.sku, p.name as product_name,
              i.quantity, i.reserved_quantity,
              (i.quantity - i.reserved_quantity) as available_quantity,
              i.reorder_point, i.reorder_quantity, i.updated_at
       FROM inventory i
       JOIN warehouses w ON w.id = i.warehouse_id
       JOIN product_variants pv ON pv.id = i.variant_id
       JOIN products p ON p.id = pv.product_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.name, pv.sku`,
      params,
    );
    return result.rows;
  }

  async getSummary(companyId: string) {
    const result = await this.db.query(
      `SELECT
         COUNT(DISTINCT i.variant_id) as total_variants,
         COUNT(DISTINCT i.warehouse_id) as total_warehouses,
         SUM(i.quantity) as total_units,
         SUM(i.reserved_quantity) as total_reserved,
         SUM(i.quantity - i.reserved_quantity) as total_available,
         COUNT(DISTINCT CASE WHEN i.quantity <= i.reorder_point THEN i.variant_id END) as low_stock_count
       FROM inventory i
       JOIN product_variants pv ON pv.id = i.variant_id
       JOIN products p ON p.id = pv.product_id
       WHERE p.company_id = $1`,
      [companyId],
    );
    return result.rows[0];
  }

  async adjustStock(companyId: string, userId: string, dto: AdjustStockDto) {
    const current = await this.db.query(
      `SELECT i.id, i.quantity FROM inventory i
       JOIN product_variants pv ON pv.id = i.variant_id
       JOIN products p ON p.id = pv.product_id
       WHERE i.warehouse_id = $1 AND i.variant_id = $2 AND p.company_id = $3`,
      [dto.warehouse_id, dto.variant_id, companyId],
    );
    const before = current.rows[0]?.quantity ?? 0;
    const after = before + dto.quantity;
    if (current.rows[0]) {
      await this.db.query(
        `UPDATE inventory SET quantity = $1, updated_at = NOW()
         WHERE warehouse_id = $2 AND variant_id = $3`,
        [after, dto.warehouse_id, dto.variant_id],
      );
    } else {
      await this.db.query(
        `INSERT INTO inventory (warehouse_id, variant_id, quantity) VALUES ($1,$2,$3)`,
        [dto.warehouse_id, dto.variant_id, Math.max(0, after)],
      );
    }
    await this.db.query(
      `INSERT INTO stock_movements
         (warehouse_id, variant_id, movement_type, quantity, quantity_before, quantity_after, reason, notes, created_by)
       VALUES ($1,$2,'adjustment',$3,$4,$5,$6,$7,$8)`,
      [dto.warehouse_id, dto.variant_id, dto.quantity, before, after, dto.reason, dto.notes ?? null, userId],
    );
    return { success: true, quantity_before: before, quantity_after: after };
  }

  async transferStock(companyId: string, userId: string, dto: TransferStockDto) {
    const fromRow = await this.db.query(
      `SELECT i.quantity FROM inventory i
       JOIN product_variants pv ON pv.id = i.variant_id
       JOIN products p ON p.id = pv.product_id
       WHERE i.warehouse_id = $1 AND i.variant_id = $2 AND p.company_id = $3`,
      [dto.from_warehouse_id, dto.variant_id, companyId],
    );
    const fromBefore = fromRow.rows[0]?.quantity ?? 0;
    if (fromBefore < dto.quantity) throw new Error('Insufficient stock');
    const toRow = await this.db.query(
      `SELECT quantity FROM inventory WHERE warehouse_id = $1 AND variant_id = $2`,
      [dto.to_warehouse_id, dto.variant_id],
    );
    const toBefore = toRow.rows[0]?.quantity ?? 0;
    await this.db.query(
      `UPDATE inventory SET quantity = quantity - $1, updated_at = NOW()
       WHERE warehouse_id = $2 AND variant_id = $3`,
      [dto.quantity, dto.from_warehouse_id, dto.variant_id],
    );
    if (toRow.rows[0]) {
      await this.db.query(
        `UPDATE inventory SET quantity = quantity + $1, updated_at = NOW()
         WHERE warehouse_id = $2 AND variant_id = $3`,
        [dto.quantity, dto.to_warehouse_id, dto.variant_id],
      );
    } else {
      await this.db.query(
        `INSERT INTO inventory (warehouse_id, variant_id, quantity) VALUES ($1,$2,$3)`,
        [dto.to_warehouse_id, dto.variant_id, dto.quantity],
      );
    }
    await this.db.query(
      `INSERT INTO stock_movements
         (warehouse_id, variant_id, movement_type, quantity, quantity_before, quantity_after, notes, created_by)
       VALUES ($1,$2,'transfer_out',$3,$4,$5,$6,$7),
              ($8,$2,'transfer_in',$3,$9,$10,$6,$7)`,
      [dto.from_warehouse_id, dto.variant_id, dto.quantity,
       fromBefore, fromBefore - dto.quantity, dto.notes ?? null, userId,
       dto.to_warehouse_id, toBefore, toBefore + dto.quantity],
    );
    return { success: true, transferred: dto.quantity };
  }

  async getMovements(companyId: string, warehouseId?: string, variantId?: string) {
    const conditions = ['p.company_id = $1'];
    const params: any[] = [companyId];
    let idx = 2;
    if (warehouseId) { conditions.push(`sm.warehouse_id = $${idx++}`); params.push(warehouseId); }
    if (variantId)   { conditions.push(`sm.variant_id = $${idx++}`);   params.push(variantId); }
    const result = await this.db.query(
      `SELECT sm.id, sm.movement_type, sm.quantity, sm.quantity_before, sm.quantity_after,
              sm.reason, sm.notes, sm.created_at,
              w.name as warehouse_name, pv.sku, p.name as product_name
       FROM stock_movements sm
       JOIN warehouses w ON w.id = sm.warehouse_id
       JOIN product_variants pv ON pv.id = sm.variant_id
       JOIN products p ON p.id = pv.product_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY sm.created_at DESC
       LIMIT 200`,
      params,
    );
    return result.rows;
  }

  async getLowStock(companyId: string) {
    const result = await this.db.query(
      `SELECT i.warehouse_id, w.name as warehouse_name,
              i.variant_id, pv.sku, p.name as product_name,
              i.quantity, i.reorder_point, i.reorder_quantity
       FROM inventory i
       JOIN warehouses w ON w.id = i.warehouse_id
       JOIN product_variants pv ON pv.id = i.variant_id
       JOIN products p ON p.id = pv.product_id
       WHERE p.company_id = $1 AND i.quantity <= i.reorder_point
       ORDER BY i.quantity ASC`,
      [companyId],
    );
    return result.rows;
  }

  async getWarehouses(companyId: string) {
    try {
      const result = await this.db.query(
        `SELECT w.id, w.name,
           COALESCE(w.location, '') as location,
           COUNT(DISTINCT i.variant_id) as sku_count,
           COALESCE(SUM(i.quantity), 0) as total_units
         FROM warehouses w
         LEFT JOIN inventory i ON i.warehouse_id = w.id
         WHERE w.company_id = $1
         GROUP BY w.id, w.name, w.location
         ORDER BY w.name`,
        [companyId],
      );
      if (result.rows.length > 0) return result.rows;
    } catch {}
    const fallback = await this.db.query(
      `SELECT DISTINCT w.id, w.name, '' as location, 0 as sku_count, 0 as total_units
       FROM warehouses w
       JOIN inventory i ON i.warehouse_id = w.id
       JOIN product_variants pv ON pv.id = i.variant_id
       JOIN products p ON p.id = pv.product_id
       WHERE p.company_id = $1`,
      [companyId],
    );
    return fallback.rows;
  }

  async createWarehouse(companyId: string, dto: { name: string; location?: string }) {
    try {
      const result = await this.db.query(
        `INSERT INTO warehouses (company_id, name, location) VALUES ($1,$2,$3) RETURNING *`,
        [companyId, dto.name, dto.location || null],
      );
      return result.rows[0];
    } catch {
      const result = await this.db.query(
        `INSERT INTO warehouses (company_id, name) VALUES ($1,$2) RETURNING *`,
        [companyId, dto.name],
      );
      return result.rows[0];
    }
  }

  async getWarehouseStock(companyId: string, warehouseId: string) {
    const result = await this.db.query(
      `SELECT i.id, i.variant_id, i.quantity, i.reorder_point,
              pv.sku, pv.name as variant_name,
              p.id as product_id, p.name as product_name
       FROM inventory i
       JOIN product_variants pv ON pv.id = i.variant_id
       JOIN products p ON p.id = pv.product_id
       WHERE i.warehouse_id = $1 AND p.company_id = $2
       ORDER BY p.name, pv.sku`,
      [warehouseId, companyId],
    );
    return result.rows;
  }

}
