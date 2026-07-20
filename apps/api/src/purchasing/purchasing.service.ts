import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreatePODto } from './dto/create-po.dto';
import { ReceiveGoodsDto } from './dto/receive-goods.dto';

@Injectable()
export class PurchasingService {
  constructor(private db: DatabaseService) {}

  // ── Suppliers ──────────────────────────────────────────────────────────────

  async createSupplier(companyId: string, dto: CreateSupplierDto) {
    const result = await this.db.query(
      `INSERT INTO suppliers (company_id,name,code,contact_person,phone,email,address,city,tax_number,payment_terms,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [companyId, dto.name, dto.code ?? null, dto.contact_person ?? null, dto.phone ?? null,
       dto.email ?? null, dto.address ?? null, dto.city ?? null, dto.tax_number ?? null,
       dto.payment_terms ?? 30, dto.notes ?? null],
    );
    return result.rows[0];
  }

  async getSuppliers(companyId: string) {
    const result = await this.db.query(
      `SELECT * FROM suppliers WHERE company_id=$1 AND is_active=true ORDER BY name`,
      [companyId],
    );
    return result.rows;
  }

  async getSupplier(companyId: string, id: string) {
    const result = await this.db.query(
      `SELECT * FROM suppliers WHERE id=$1 AND company_id=$2`,
      [id, companyId],
    );
    if (!result.rows[0]) throw new NotFoundException('Supplier not found');
    return result.rows[0];
  }

  // ── Purchase Orders ────────────────────────────────────────────────────────

  async createPO(companyId: string, userId: string, dto: CreatePODto) {
    let subtotal = 0;
    let taxTotal = 0;
    const processedLines = dto.lines.map(line => {
      const taxRate = line.tax_rate ?? 15;
      const lineSubtotal = line.unit_cost * line.quantity_ordered;
      const taxAmt = (lineSubtotal * taxRate) / 100;
      subtotal += lineSubtotal;
      taxTotal += taxAmt;
      return { ...line, tax_rate: taxRate, tax_amount: taxAmt, line_total: lineSubtotal + taxAmt };
    });
    const total = subtotal + taxTotal;
    const poNumber = `PO-${Date.now()}`;

    const po = await this.db.query(
      `INSERT INTO purchase_orders (company_id,po_number,supplier_id,warehouse_id,created_by,
         expected_date,subtotal,tax_amount,total,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [companyId, poNumber, dto.supplier_id, dto.warehouse_id, userId,
       dto.expected_date ?? null, subtotal, taxTotal, total, dto.notes ?? null],
    );
    const poId = po.rows[0].id;

    for (const line of processedLines) {
      await this.db.query(
        `INSERT INTO purchase_order_lines (po_id,variant_id,quantity_ordered,unit_cost,tax_rate,tax_amount,line_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [poId, line.variant_id, line.quantity_ordered, line.unit_cost,
         line.tax_rate, line.tax_amount, line.line_total],
      );
    }
    return { ...po.rows[0], lines: processedLines };
  }

  async getPOs(companyId: string, status?: string) {
    const conditions = ['po.company_id=$1'];
    const params: any[] = [companyId];
    if (status) { conditions.push('po.status=$2'); params.push(status); }
    const result = await this.db.query(
      `SELECT po.*, s.name as supplier_name, w.name as warehouse_name, u.name as created_by_name
       FROM purchase_orders po
       JOIN suppliers s ON s.id=po.supplier_id
       JOIN warehouses w ON w.id=po.warehouse_id
       JOIN users u ON u.id=po.created_by
       WHERE ${conditions.join(' AND ')}
       ORDER BY po.created_at DESC LIMIT 100`,
      params,
    );
    return result.rows;
  }

  async getPO(companyId: string, id: string) {
    const po = await this.db.query(
      `SELECT po.*, s.name as supplier_name, w.name as warehouse_name
       FROM purchase_orders po
       JOIN suppliers s ON s.id=po.supplier_id
       JOIN warehouses w ON w.id=po.warehouse_id
       WHERE po.id=$1 AND po.company_id=$2`,
      [id, companyId],
    );
    if (!po.rows[0]) throw new NotFoundException('Purchase order not found');
    const lines = await this.db.query(
      `SELECT l.*, pv.sku, p.name as product_name
       FROM purchase_order_lines l
       JOIN product_variants pv ON pv.id=l.variant_id
       JOIN products p ON p.id=pv.product_id
       WHERE l.po_id=$1`,
      [id],
    );
    return { ...po.rows[0], lines: lines.rows };
  }

  async approvePO(companyId: string, userId: string, id: string) {
    const po = await this.db.query(
      `SELECT * FROM purchase_orders WHERE id=$1 AND company_id=$2 AND status='draft'`,
      [id, companyId],
    );
    if (!po.rows[0]) throw new NotFoundException('Draft PO not found');
    const result = await this.db.query(
      `UPDATE purchase_orders SET status='approved', approved_by=$1, approved_at=NOW(), updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [userId, id],
    );
    return result.rows[0];
  }

  async cancelPO(companyId: string, id: string) {
    const po = await this.db.query(
      `SELECT * FROM purchase_orders WHERE id=$1 AND company_id=$2 AND status IN ('draft','approved')`,
      [id, companyId],
    );
    if (!po.rows[0]) throw new NotFoundException('PO not found or cannot be cancelled');
    const result = await this.db.query(
      `UPDATE purchase_orders SET status='cancelled', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [id],
    );
    return result.rows[0];
  }

  // ── Goods Receiving ────────────────────────────────────────────────────────

  async receiveGoods(companyId: string, userId: string, dto: ReceiveGoodsDto) {
    const po = await this.db.query(
      `SELECT * FROM purchase_orders WHERE id=$1 AND company_id=$2 AND status IN ('approved','partially_received')`,
      [dto.po_id, companyId],
    );
    if (!po.rows[0]) throw new NotFoundException('Approved PO not found');

    const grnNumber = `GRN-${Date.now()}`;
    const grn = await this.db.query(
      `INSERT INTO goods_receipts (company_id,grn_number,po_id,warehouse_id,received_by,supplier_invoice,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [companyId, grnNumber, dto.po_id, po.rows[0].warehouse_id,
       userId, dto.supplier_invoice ?? null, dto.notes ?? null],
    );
    const grnId = grn.rows[0].id;

    for (const line of dto.lines) {
      // Insert GRN line
      await this.db.query(
        `INSERT INTO goods_receipt_lines (grn_id,po_line_id,variant_id,quantity_received,unit_cost)
         VALUES ($1,$2,$3,$4,$5)`,
        [grnId, line.po_line_id, line.variant_id, line.quantity_received, line.unit_cost],
      );
      // Update PO line received qty
      await this.db.query(
        `UPDATE purchase_order_lines SET quantity_received=quantity_received+$1 WHERE id=$2`,
        [line.quantity_received, line.po_line_id],
      );
      // Update inventory
      await this.db.query(
        `INSERT INTO inventory (warehouse_id,variant_id,quantity)
         VALUES ($1,$2,$3)
         ON CONFLICT (warehouse_id,variant_id)
         DO UPDATE SET quantity=inventory.quantity+$3, updated_at=NOW()`,
        [po.rows[0].warehouse_id, line.variant_id, line.quantity_received],
      );
      // Log stock movement
      await this.db.query(
        `INSERT INTO stock_movements (warehouse_id,variant_id,movement_type,quantity,quantity_before,quantity_after,reason,created_by)
         SELECT $1,$2,'purchase',$3,quantity-$3,quantity,$4,$5
         FROM inventory WHERE warehouse_id=$1 AND variant_id=$2`,
        [po.rows[0].warehouse_id, line.variant_id, line.quantity_received, `GRN ${grnNumber}`, userId],
      );
    }

    // Check if PO is fully received
    const remaining = await this.db.query(
      `SELECT COUNT(*) as pending FROM purchase_order_lines
       WHERE po_id=$1 AND quantity_received < quantity_ordered`,
      [dto.po_id],
    );
    const newStatus = parseInt(remaining.rows[0].pending) === 0 ? 'received' : 'partially_received';
    await this.db.query(
      `UPDATE purchase_orders SET status=$1, updated_at=NOW() WHERE id=$2`,
      [newStatus, dto.po_id],
    );

    return { ...grn.rows[0], status: newStatus, lines: dto.lines };
  }

  async getGRNs(companyId: string) {
    const result = await this.db.query(
      `SELECT g.*, po.po_number, s.name as supplier_name, u.name as received_by_name
       FROM goods_receipts g
       JOIN purchase_orders po ON po.id=g.po_id
       JOIN suppliers s ON s.id=po.supplier_id
       JOIN users u ON u.id=g.received_by
       WHERE g.company_id=$1 ORDER BY g.received_at DESC LIMIT 100`,
      [companyId],
    );
    return result.rows;
  }
}
