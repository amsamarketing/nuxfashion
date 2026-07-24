import { Injectable, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { OpenSessionDto } from './dto/open-session.dto';
import { CloseSessionDto } from './dto/close-session.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { CreateReturnDto } from './dto/create-return.dto';
import { CreateDiscountDto } from './dto/create-discount.dto';

@Injectable()
export class SalesService {
  constructor(private db: DatabaseService) {}

  // ─── POS Sessions ────────────────────────────────────────────────────────────

  async openSession(companyId: string, userId: string, dto: OpenSessionDto) {
    const existing = await this.db.query(
      `SELECT id FROM pos_sessions WHERE company_id=$1 AND cashier_id=$2 AND status='open'`,
      [companyId, userId],
    );
    if (existing.rows.length) throw new BadRequestException('You already have an open session');
    const result = await this.db.query(
      `INSERT INTO pos_sessions (company_id, warehouse_id, cashier_id, opening_cash, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [companyId, dto.warehouse_id, userId, dto.opening_cash, dto.notes ?? null],
    );
    return result.rows[0];
  }

  async closeSession(companyId: string, userId: string, sessionId: string, dto: CloseSessionDto) {
    const session = await this.db.query(
      `SELECT * FROM pos_sessions WHERE id=$1 AND company_id=$2 AND cashier_id=$3 AND status='open'`,
      [sessionId, companyId, userId],
    );
    if (!session.rows[0]) throw new NotFoundException('Open session not found');
    const cashSales = await this.db.query(
      `SELECT COALESCE(SUM(p.amount),0) as total
       FROM payments p JOIN sales_orders o ON o.id=p.order_id
       WHERE o.pos_session_id=$1 AND p.method='cash' AND p.status='completed'`,
      [sessionId],
    );
    const cashReturns = await this.db.query(
      `SELECT COALESCE(SUM(r.refund_amount),0) as total
       FROM returns r JOIN sales_orders o ON o.id=r.original_order_id
       WHERE o.pos_session_id=$1 AND r.refund_method='cash'`,
      [sessionId],
    );
    const expected = parseFloat(session.rows[0].opening_cash) + parseFloat(cashSales.rows[0].total) - parseFloat(cashReturns.rows[0].total);
    const diff = dto.closing_cash - expected;
    const result = await this.db.query(
      `UPDATE pos_sessions SET status='closed', closing_cash=$1, expected_cash=$2,
       cash_difference=$3, notes=COALESCE($4,notes), closed_at=NOW()
       WHERE id=$5 RETURNING *`,
      [dto.closing_cash, expected, diff, dto.notes ?? null, sessionId],
    );
    return result.rows[0];
  }

  async getCurrentSession(companyId: string, userId: string) {
    const result = await this.db.query(
      `SELECT s.*, u.name as cashier_name, w.name as warehouse_name
       FROM pos_sessions s JOIN users u ON u.id=s.cashier_id JOIN warehouses w ON w.id=s.warehouse_id
       WHERE s.company_id=$1 AND s.cashier_id=$2 AND s.status='open'
       ORDER BY s.opened_at DESC LIMIT 1`, [companyId, userId],
    );
    return result.rows[0] ?? null;
  }

  async getSessionReport(companyId: string, sessionId: string) {
    const session = await this.db.query(
      `SELECT s.*,u.name as cashier_name,w.name as warehouse_name
       FROM pos_sessions s JOIN users u ON u.id=s.cashier_id JOIN warehouses w ON w.id=s.warehouse_id
       WHERE s.id=$1 AND s.company_id=$2`, [sessionId, companyId],
    );
    if (!session.rows[0]) throw new NotFoundException('Session not found');
    const totals = await this.db.query(
      `SELECT COUNT(*)::int transactions,COALESCE(SUM(total),0) total_sales,
       COALESCE(SUM(discount_amount),0) total_discount,
       COALESCE(SUM(COALESCE(tax_amount,total*15/115)),0) total_tax
       FROM sales_orders WHERE pos_session_id=$1 AND status NOT IN ('draft','cancelled')`, [sessionId],
    );
    const payments = await this.db.query(
      `SELECT p.method,COUNT(*)::int transactions,COALESCE(SUM(p.amount),0) total
       FROM payments p JOIN sales_orders o ON o.id=p.order_id
       WHERE o.pos_session_id=$1 AND p.status='completed' GROUP BY p.method ORDER BY total DESC`, [sessionId],
    );
    const returns = await this.db.query(
      `SELECT COUNT(*)::int return_count,COALESCE(SUM(r.refund_amount),0) total_returned,
       COALESCE(SUM(r.refund_amount) FILTER (WHERE r.refund_method='cash'),0) cash_returns
       FROM returns r JOIN sales_orders o ON o.id=r.original_order_id WHERE o.pos_session_id=$1`, [sessionId],
    );
    const items = await this.db.query(
      `SELECT p.name,COALESCE(SUM(l.quantity),0)::int qty,COALESCE(SUM(l.line_total),0) revenue
       FROM sales_order_lines l JOIN sales_orders o ON o.id=l.order_id
       JOIN product_variants pv ON pv.id=l.variant_id JOIN products p ON p.id=pv.product_id
       WHERE o.pos_session_id=$1 AND o.status NOT IN ('draft','cancelled')
       GROUP BY p.name ORDER BY qty DESC LIMIT 8`, [sessionId],
    );
    return { session:session.rows[0], totals:totals.rows[0], payments:payments.rows, returns:returns.rows[0], top_items:items.rows };
  }

  async getSessions(companyId: string) {
    const result = await this.db.query(
      `SELECT s.*, u.name as cashier_name, w.name as warehouse_name
       FROM pos_sessions s
       JOIN users u ON u.id=s.cashier_id
       JOIN warehouses w ON w.id=s.warehouse_id
       WHERE s.company_id=$1 ORDER BY s.opened_at DESC LIMIT 50`,
      [companyId],
    );
    return result.rows;
  }

  // ─── Discounts ───────────────────────────────────────────────────────────────

  async createDiscount(companyId: string, dto: CreateDiscountDto) {
    const result = await this.db.query(
      `INSERT INTO discounts (company_id,name,description,type,scope,value,min_order_amount,
         buy_quantity,get_quantity,is_coupon,coupon_code,usage_limit,valid_from,valid_until)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [companyId, dto.name, dto.description ?? null, dto.type, dto.scope, dto.value,
       dto.min_order_amount ?? 0, dto.buy_quantity ?? null, dto.get_quantity ?? null,
       dto.is_coupon ?? false, dto.coupon_code ?? null, dto.usage_limit ?? null,
       dto.valid_from ?? null, dto.valid_until ?? null],
    );
    return result.rows[0];
  }

  async getDiscounts(companyId: string) {
    const result = await this.db.query(
      `SELECT * FROM discounts WHERE company_id=$1 ORDER BY created_at DESC`,
      [companyId],
    );
    return result.rows;
  }

  async validateCoupon(companyId: string, code: string, orderAmount: number) {
    const result = await this.db.query(
      `SELECT * FROM discounts WHERE company_id=$1 AND coupon_code=$2 AND is_active=true
       AND (valid_from IS NULL OR valid_from <= NOW())
       AND (valid_until IS NULL OR valid_until >= NOW())
       AND (usage_limit IS NULL OR usage_count < usage_limit)`,
      [companyId, code],
    );
    if (!result.rows[0]) throw new BadRequestException('Invalid or expired coupon');
    const d = result.rows[0];
    if (orderAmount < (d.min_order_amount ?? 0))
      throw new BadRequestException(`Minimum order amount is ${d.min_order_amount} SAR`);
    const discountAmt = d.type === 'percentage'
      ? (orderAmount * d.value) / 100
      : Math.min(d.value, orderAmount);
    return { discount: d, discount_amount: discountAmt };
  }

  // ─── Orders ──────────────────────────────────────────────────────────────────

  async createOrder(companyId: string, userId: string, dto: CreateOrderDto) {
    if (!dto.customer_id) throw new BadRequestException('Customer name and phone are required');
    const customer = await this.db.query(
      `SELECT id FROM customers WHERE id=$1 AND company_id=$2 AND is_active=true
       AND NULLIF(TRIM(name),'') IS NOT NULL AND NULLIF(TRIM(phone),'') IS NOT NULL`,
      [dto.customer_id, companyId],
    );
    if (!customer.rows[0]) throw new BadRequestException('Select a customer with both name and phone');
    if (!dto.pos_session_id) throw new BadRequestException('Start a POS shift before creating a sale');
    const activeSession = await this.db.query(
      `SELECT id FROM pos_sessions WHERE id=$1 AND company_id=$2 AND cashier_id=$3 AND status='open'`,
      [dto.pos_session_id, companyId, userId],
    );
    if (!activeSession.rows[0]) throw new BadRequestException('Your POS shift is not open');
    // Calculate line totals
    let subtotal = 0;
    const processedLines = dto.lines.map(line => {
      const lineSubtotal = line.unit_price * line.quantity;
      let discountAmt = 0;
      if (line.discount_type === 'percentage' && line.discount_value) {
        discountAmt = (lineSubtotal * line.discount_value) / 100;
      } else if (line.discount_type === 'fixed_amount' && line.discount_value) {
        discountAmt = Math.min(line.discount_value, lineSubtotal);
      }
      const lineTotal = lineSubtotal - discountAmt;
      subtotal += lineTotal;
      return { ...line, discount_amount: discountAmt, line_total: lineTotal };
    });

    // Calculate order-level discounts
    let orderDiscountTotal = 0;
    const processedDiscounts: any[] = [];
    for (const d of dto.discounts ?? []) {
      let amt = 0;
      if (d.type === 'percentage') amt = (subtotal * d.value) / 100;
      else if (d.type === 'fixed_amount' || d.type === 'coupon') amt = Math.min(d.value, subtotal);
      orderDiscountTotal += amt;
      processedDiscounts.push({ ...d, amount: amt });
    }

    // Validate & lookup coupon discounts
    for (const d of processedDiscounts) {
      if (d.coupon_code && d.type === 'coupon') {
        const couponCheck = await this.db.query(
          `SELECT * FROM discounts WHERE company_id=$1 AND coupon_code=$2 AND is_active=true
           AND (valid_from IS NULL OR valid_from <= NOW())
           AND (valid_until IS NULL OR valid_until >= NOW())
           AND (usage_limit IS NULL OR usage_count < usage_limit)`,
          [companyId, d.coupon_code],
        );
        if (!couponCheck.rows[0]) throw new BadRequestException(`Invalid coupon: ${d.coupon_code}`);
        d.discount_id = couponCheck.rows[0].id;
      }
    }

    const total = Math.max(0, subtotal - orderDiscountTotal);
    const orderNumber = `ORD-${Date.now()}`;

    // Insert order
    const orderResult = await this.db.query(
      `INSERT INTO sales_orders
         (company_id,order_number,pos_session_id,warehouse_id,cashier_id,customer_id,
          status,subtotal,discount_amount,total,notes)
       VALUES ($1,$2,$3,$4,$5,$6,'confirmed',$7,$8,$9,$10) RETURNING *`,
      [companyId, orderNumber, dto.pos_session_id ?? null, dto.warehouse_id,
       userId, dto.customer_id ?? null, subtotal, orderDiscountTotal, total, dto.notes ?? null],
    );
    const order = orderResult.rows[0];

    // Insert lines
    for (const line of processedLines) {
      await this.db.query(
        `INSERT INTO sales_order_lines
           (order_id,variant_id,quantity,unit_price,discount_type,discount_value,discount_amount,line_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [order.id, line.variant_id, line.quantity, line.unit_price,
         line.discount_type ?? null, line.discount_value ?? 0, line.discount_amount, line.line_total],
      );
      // Deduct from inventory
      await this.db.query(
        `UPDATE inventory SET quantity = quantity - $1, updated_at=NOW()
         WHERE warehouse_id=$2 AND variant_id=$3`,
        [line.quantity, dto.warehouse_id, line.variant_id],
      );
      await this.db.query(
        `INSERT INTO stock_movements (warehouse_id,variant_id,movement_type,quantity,quantity_before,quantity_after,reason,created_by)
         SELECT $1,$2,'sale',$3,quantity+$3,quantity,$4,$5 FROM inventory
         WHERE warehouse_id=$1 AND variant_id=$2`,
        [dto.warehouse_id, line.variant_id, -line.quantity, `Order ${orderNumber}`, userId],
      );
    }

    // Insert order discounts
    for (const d of processedDiscounts) {
      await this.db.query(
        `INSERT INTO order_discounts (order_id,discount_id,name,type,value,amount,coupon_code)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [order.id, d.discount_id ?? null, d.name, d.type, d.value, d.amount, d.coupon_code ?? null],
      );
      // Increment coupon usage
      if (d.discount_id) {
        await this.db.query(
          `UPDATE discounts SET usage_count=usage_count+1 WHERE id=$1`, [d.discount_id],
        );
      }
    }

    return { ...order, lines: processedLines, discounts: processedDiscounts };
  }

  async getOrders(companyId: string, status?: string) {
    const conditions = ['o.company_id=$1'];
    const params: any[] = [companyId];
    if (status) { conditions.push(`o.status=$2`); params.push(status); }
    const result = await this.db.query(
      `SELECT o.*, u.name as cashier_name, c.name as customer_name, c.phone as customer_phone,
         COALESCE((SELECT SUM(l.quantity) FROM sales_order_lines l WHERE l.order_id=o.id),0)::int as item_count,
         COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.order_id=o.id AND p.status='completed'),0) as paid_amount,
         COALESCE((SELECT STRING_AGG(DISTINCT p.method, ', ' ORDER BY p.method) FROM payments p WHERE p.order_id=o.id AND p.status='completed'),'') as payment_method,
         COALESCE((SELECT SUM(r.refund_amount) FROM returns r WHERE r.original_order_id=o.id),0) as returned_amount
       FROM sales_orders o
       JOIN users u ON u.id=o.cashier_id
       LEFT JOIN customers c ON c.id=o.customer_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY o.created_at DESC LIMIT 100`,
      params,
    );
    return result.rows;
  }

  async getOrder(companyId: string, orderId: string) {
    const order = await this.db.query(
      `SELECT o.*, u.name as cashier_name, c.name as customer_name, c.phone as customer_phone
       FROM sales_orders o
       LEFT JOIN users u ON u.id=o.cashier_id
       LEFT JOIN customers c ON c.id=o.customer_id
       WHERE (o.id::text=$1 OR o.order_number=$1) AND o.company_id=$2`,
      [orderId, companyId],
    );
    if (!order.rows[0]) throw new NotFoundException('Order not found');
    const oid = order.rows[0].id;
    const lines = await this.db.query(
      `SELECT l.*, pv.sku, pv.barcode, pv.name as variant_name, p.name as product_name
       FROM sales_order_lines l
       LEFT JOIN product_variants pv ON pv.id=l.variant_id
       LEFT JOIN products p ON p.id=pv.product_id
       WHERE l.order_id=$1`,
      [oid],
    );
    const payments = await this.db.query(
      `SELECT * FROM payments WHERE order_id=$1`, [oid],
    ).catch(()=>({ rows:[] as any[] }));
    // Fetch returns for this order
    const returns = await this.db.query(
      `SELECT r.*, json_agg(json_build_object('order_line_id',rl.order_line_id,'variant_id',rl.variant_id,'quantity',rl.quantity,'refund_amount',rl.refund_amount)) as lines
       FROM returns r
       LEFT JOIN return_lines rl ON rl.return_id=r.id
       WHERE r.original_order_id=$1
       GROUP BY r.id`,
      [oid],
    ).catch(()=>({ rows:[] as any[] }));
    return { ...order.rows[0], lines: lines.rows, payments: payments.rows, returns: returns.rows };
  }

  async cancelOrder(companyId: string, userId: string, orderId: string) {
    const order = await this.db.query(
      `UPDATE sales_orders SET status='cancelled',updated_at=NOW()
       WHERE id=$1 AND company_id=$2 AND status IN ('draft','pending','confirmed')
       RETURNING *`, [orderId,companyId],
    );
    if (!order.rows[0]) throw new BadRequestException('Only an unpaid order can be cancelled');
    const lines = await this.db.query(
      `SELECT variant_id,quantity FROM sales_order_lines WHERE order_id=$1`, [orderId],
    );
    for (const line of lines.rows) {
      await this.db.query(
        `UPDATE inventory SET quantity=quantity+$1,updated_at=NOW()
         WHERE warehouse_id=$2 AND variant_id=$3`,
        [line.quantity,order.rows[0].warehouse_id,line.variant_id],
      );
      await this.db.query(
        `INSERT INTO stock_movements
         (warehouse_id,variant_id,movement_type,quantity,quantity_before,quantity_after,reason,created_by)
         SELECT $1,$2,'sale_cancel',$3,quantity-$3,quantity,$4,$5 FROM inventory
         WHERE warehouse_id=$1 AND variant_id=$2`,
        [order.rows[0].warehouse_id,line.variant_id,line.quantity,`Cancelled ${order.rows[0].order_number}`,userId],
      );
    }
    return { ...order.rows[0],restocked_units:lines.rows.reduce((sum:any,line:any)=>sum+Number(line.quantity),0) };
  }

  // ─── Payments ────────────────────────────────────────────────────────────────

  async processPayment(companyId: string, dto: ProcessPaymentDto) {
    const order = await this.db.query(
      `SELECT * FROM sales_orders WHERE id=$1 AND company_id=$2`,
      [dto.order_id, companyId],
    );
    if (!order.rows[0]) throw new NotFoundException('Order not found');
    if (order.rows[0].status === 'paid') throw new BadRequestException('Order already paid');

    const totalPaid = dto.payments.reduce((s, p) => s + p.amount, 0);
    const orderTotal = parseFloat(order.rows[0].total);
    const changeDue = Math.max(0, totalPaid - orderTotal);

    for (const p of dto.payments) {
      await this.db.query(
        `INSERT INTO payments (order_id,method,amount,reference) VALUES ($1,$2,$3,$4)`,
        [dto.order_id, p.method, p.amount, p.reference ?? null],
      );
    }

    await this.db.query(
      `UPDATE sales_orders SET status='paid', amount_paid=$1, change_due=$2, updated_at=NOW()
       WHERE id=$3`,
      [totalPaid, changeDue, dto.order_id],
    );

    // Update customer total_spent
    if (order.rows[0].customer_id) {
      await this.db.query(
        `UPDATE customers SET total_spent=total_spent+$1, updated_at=NOW() WHERE id=$2`,
        [orderTotal, order.rows[0].customer_id],
      );
    }

    return { success: true, total_paid: totalPaid, change_due: changeDue };
  }

  // ─── Returns ─────────────────────────────────────────────────────────────────

  async createReturn(companyId: string, userId: string, dto: CreateReturnDto) {
    try {
    const order = await this.db.query(
      `SELECT * FROM sales_orders WHERE id=$1 AND company_id=$2 AND status='paid'`,
      [dto.original_order_id, companyId],
    );
    if (!order.rows[0]) throw new NotFoundException('Paid order not found');

    const totalRefund = dto.lines.reduce((s, l) => s + l.refund_amount, 0);
    const returnNumber = `RET-${Date.now()}`;

    const ret = await this.db.query(
      `INSERT INTO returns (company_id,return_number,original_order_id,cashier_id,reason,
         refund_method,refund_amount,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [companyId, returnNumber, dto.original_order_id, userId,
       dto.reason ?? null, dto.refund_method, totalRefund, dto.notes ?? null],
    );
    const ret_id = ret.rows[0].id;

    for (const line of dto.lines) {
      await this.db.query(
        `INSERT INTO return_lines (return_id,order_line_id,variant_id,quantity,refund_amount,restock)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [ret_id, line.order_line_id, line.variant_id, line.quantity,
         line.refund_amount, line.restock ?? true],
      );
      if (line.restock ?? true) {
        await this.db.query(
          `UPDATE inventory SET quantity=quantity+$1, updated_at=NOW()
           WHERE warehouse_id=$2 AND variant_id=$3`,
          [line.quantity, order.rows[0].warehouse_id, line.variant_id],
        );
        await this.db.query(
          `INSERT INTO stock_movements (warehouse_id,variant_id,movement_type,quantity,quantity_before,quantity_after,reason,created_by)
           SELECT $1,$2,'return',$3,quantity-$3,quantity,$4,$5 FROM inventory
           WHERE warehouse_id=$1 AND variant_id=$2`,
          [order.rows[0].warehouse_id, line.variant_id, line.quantity, `Return ${returnNumber}`, userId],
        );
      }
    }

    const origOrder = order.rows[0];
    const isFullReturn = totalRefund >= parseFloat(origOrder.total) * 0.99;
    await this.db.query(
      `UPDATE sales_orders SET status=$1, updated_at=NOW() WHERE id=$2`,
      [isFullReturn ? 'refunded' : 'partial_return', dto.original_order_id],
    );

    return { ...ret.rows[0], is_full_return: isFullReturn };
    } catch(e:any) { throw new InternalServerErrorException('createReturn: '+(e?.message||e)); }
  }

  async getReturns(companyId: string) {
    const result = await this.db.query(
      `SELECT r.*, u.name as cashier_name, o.order_number
       FROM returns r
       JOIN users u ON u.id=r.cashier_id
       JOIN sales_orders o ON o.id=r.original_order_id
       WHERE r.company_id=$1 ORDER BY r.created_at DESC LIMIT 100`,
      [companyId],
    );
    return result.rows;
  }
}
