import { Injectable, InternalServerErrorException, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { OpenSessionDto } from './dto/open-session.dto';
import { CloseSessionDto } from './dto/close-session.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { CreateReturnDto } from './dto/create-return.dto';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class SalesService {
  constructor(private db: DatabaseService) {}

  private async postBranchAccount(companyId:string,warehouseId:string,method:string,amount:number,direction:'credit'|'debit',referenceType:string,referenceId:string,note:string){
    const families:Record<string,string[]>={
      cash:['cash'],card:['card'],mada:['mada','card'],apple_pay:['apple_pay','card'],
      stc_pay:['stc_pay','card'],tabby:['tabby'],tamara:['tamara'],bank_transfer:['bank_transfer'],
    };
    const methods=families[method]||[];
    if(!methods.length||amount<=0)return;
    const branch=await this.db.query(`SELECT id FROM branches WHERE company_id=$1 AND warehouse_id=$2`,[companyId,warehouseId]);
    if(!branch.rows[0])return;
    let account=await this.db.query(
      `SELECT id,commission_rate,fixed_fee,fee_vat_rate FROM branch_payment_accounts WHERE branch_id=$1 AND method=ANY($2::text[]) AND is_active=true
       ORDER BY is_default DESC,array_position($2::text[],method),created_at LIMIT 1`,[branch.rows[0].id,methods]);
    if(!account.rows[0]){
      const id=randomUUID();
      await this.db.query(
        `INSERT INTO branch_payment_accounts(id,branch_id,name,method,is_default) VALUES($1,$2,$3,$4,true)`,
        [id,branch.rows[0].id,method.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()),methods[0]]);
      account={rows:[{id,commission_rate:0,fixed_fee:0,fee_vat_rate:15}]} as any;
    }
    await this.db.query(
      `INSERT INTO branch_account_transactions(id,branch_id,account_id,direction,amount,reference_type,reference_id,note)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [randomUUID(),branch.rows[0].id,account.rows[0].id,direction,amount,referenceType,referenceId,note]);
    if(direction==='credit'){
      const commission=Number((amount*Number(account.rows[0].commission_rate||0)/100+Number(account.rows[0].fixed_fee||0)).toFixed(2));
      const feeVat=Number((commission*Number(account.rows[0].fee_vat_rate||0)/100).toFixed(2));
      if(commission>0)await this.db.query(
        `INSERT INTO branch_account_transactions(id,branch_id,account_id,direction,amount,reference_type,reference_id,note)
         VALUES($1,$2,$3,'debit',$4,'payment_commission',$5,$6)`,
        [randomUUID(),branch.rows[0].id,account.rows[0].id,commission,referenceId,`${note} · provider commission`]);
      if(feeVat>0)await this.db.query(
        `INSERT INTO branch_account_transactions(id,branch_id,account_id,direction,amount,reference_type,reference_id,note)
         VALUES($1,$2,$3,'debit',$4,'payment_fee_vat',$5,$6)`,
        [randomUUID(),branch.rows[0].id,account.rows[0].id,feeVat,referenceId,`${note} · VAT on provider fee`]);
    }
  }

  // ─── POS Sessions ────────────────────────────────────────────────────────────

  async openSession(companyId: string, userId: string, dto: OpenSessionDto) {
    const existing = await this.db.query(
      `SELECT id FROM pos_sessions WHERE company_id=$1 AND cashier_id=$2 AND status='open'`,
      [companyId, userId],
    );
    if (existing.rows.length) throw new BadRequestException('You already have an open session');
    const branchAccess = await this.db.query(
      `SELECT
        EXISTS(SELECT 1 FROM branch_user_assignments a JOIN branches b ON b.id=a.branch_id WHERE a.user_id=$1 AND b.company_id=$2) has_assignments,
        EXISTS(SELECT 1 FROM branch_user_assignments a JOIN branches b ON b.id=a.branch_id WHERE a.user_id=$1 AND b.company_id=$2 AND b.warehouse_id=$3 AND b.is_active=true) allowed`,
      [userId,companyId,dto.warehouse_id],
    ).catch(()=>({rows:[{has_assignments:false,allowed:true}]} as any));
    if(branchAccess.rows[0].has_assignments&&!branchAccess.rows[0].allowed)
      throw new BadRequestException('You are not assigned to this branch');
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

  private async ensureLoyaltySchema() {
    await this.db.query(`
      ALTER TABLE discounts ADD COLUMN IF NOT EXISTS applies_to varchar(20) NOT NULL DEFAULT 'all';
      ALTER TABLE discounts ADD COLUMN IF NOT EXISTS category_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
      ALTER TABLE discounts ADD COLUMN IF NOT EXISTS product_ids jsonb NOT NULL DEFAULT '[]'::jsonb;
      ALTER TABLE discounts ADD COLUMN IF NOT EXISTS tier_restriction jsonb NOT NULL DEFAULT '[]'::jsonb;
      ALTER TABLE discounts ADD COLUMN IF NOT EXISTS occasion varchar(80);
      ALTER TABLE discounts ADD COLUMN IF NOT EXISTS stackable boolean NOT NULL DEFAULT true;
      ALTER TABLE discounts ADD COLUMN IF NOT EXISTS first_order_only boolean NOT NULL DEFAULT false;
      ALTER TABLE discounts ADD COLUMN IF NOT EXISTS one_per_customer boolean NOT NULL DEFAULT false;
      ALTER TABLE discounts ADD COLUMN IF NOT EXISTS channels jsonb NOT NULL DEFAULT '["pos","ecommerce"]'::jsonb;
      CREATE TABLE IF NOT EXISTS discount_redemptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id uuid NOT NULL, discount_id uuid NOT NULL REFERENCES discounts(id),
        customer_id uuid, order_id uuid, amount numeric(12,2) NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_discount_redemptions_customer ON discount_redemptions(discount_id,customer_id);
      CREATE TABLE IF NOT EXISTS gift_cards (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL,
        code varchar(80) NOT NULL, original_balance numeric(12,2) NOT NULL,
        balance numeric(12,2) NOT NULL, recipient_name varchar(160),
        recipient_email varchar(200), expires_at timestamptz, is_active boolean NOT NULL DEFAULT true,
        created_by uuid, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(company_id,code)
      );
      CREATE TABLE IF NOT EXISTS gift_card_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), gift_card_id uuid NOT NULL REFERENCES gift_cards(id),
        type varchar(30) NOT NULL, amount numeric(12,2) NOT NULL, balance_after numeric(12,2) NOT NULL,
        reference_id uuid, created_by uuid, notes text, created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
  }

  async createDiscount(companyId: string, dto: CreateDiscountDto) {
    await this.ensureLoyaltySchema();
    const result = await this.db.query(
      `INSERT INTO discounts (company_id,name,description,type,scope,value,min_order_amount,
         buy_quantity,get_quantity,is_coupon,coupon_code,usage_limit,valid_from,valid_until,
         applies_to,category_ids,product_ids,tier_restriction,occasion,stackable,first_order_only,one_per_customer,is_active,channels)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18::jsonb,$19,$20,$21,$22,$23,$24::jsonb) RETURNING *`,
      [companyId, dto.name, dto.description ?? null, dto.type, dto.scope, dto.value,
       dto.min_order_amount ?? 0, dto.buy_quantity ?? null, dto.get_quantity ?? null,
       dto.is_coupon ?? false, dto.coupon_code ?? null, dto.usage_limit ?? null,
       dto.valid_from ?? null, dto.valid_until ?? null, dto.applies_to ?? 'all',
       JSON.stringify(dto.category_ids ?? []), JSON.stringify(dto.product_ids ?? []),
       JSON.stringify(dto.tier_restriction ?? []), dto.occasion ?? null, dto.stackable ?? true,
       dto.first_order_only ?? false, dto.one_per_customer ?? false, dto.is_active ?? true,
       JSON.stringify(dto.channels?.length?dto.channels:['pos','ecommerce'])],
    );
    return result.rows[0];
  }

  async getDiscounts(companyId: string) {
    await this.ensureLoyaltySchema();
    const result = await this.db.query(
      `SELECT * FROM discounts WHERE company_id=$1 ORDER BY created_at DESC`,
      [companyId],
    );
    return result.rows;
  }

  async updateDiscount(companyId: string, id: string, dto: Partial<CreateDiscountDto>) {
    await this.ensureLoyaltySchema();
    const current=await this.db.query(`SELECT * FROM discounts WHERE id=$1 AND company_id=$2`,[id,companyId]);
    if(!current.rows[0])throw new NotFoundException('Discount not found');
    const d={...current.rows[0],...dto};
    const result=await this.db.query(
      `UPDATE discounts SET name=$1,description=$2,type=$3,scope=$4,value=$5,min_order_amount=$6,
       buy_quantity=$7,get_quantity=$8,is_coupon=$9,coupon_code=$10,usage_limit=$11,valid_from=$12,valid_until=$13,
       applies_to=$14,category_ids=$15::jsonb,product_ids=$16::jsonb,tier_restriction=$17::jsonb,
       occasion=$18,stackable=$19,first_order_only=$20,one_per_customer=$21,is_active=$22,channels=$23::jsonb,updated_at=NOW()
       WHERE id=$24 AND company_id=$25 RETURNING *`,
      [d.name,d.description,d.type,d.scope,d.value,d.min_order_amount,d.buy_quantity,d.get_quantity,
       d.is_coupon,d.coupon_code,d.usage_limit,d.valid_from,d.valid_until,d.applies_to||'all',
       JSON.stringify(d.category_ids||[]),JSON.stringify(d.product_ids||[]),JSON.stringify(d.tier_restriction||[]),
       d.occasion,d.stackable!==false,!!d.first_order_only,!!d.one_per_customer,d.is_active!==false,
       JSON.stringify(d.channels?.length?d.channels:['pos','ecommerce']),id,companyId]);
    return result.rows[0];
  }

  async getDiscountReport(companyId:string){
    await this.ensureLoyaltySchema();
    const result=await this.db.query(
      `SELECT d.id,d.name,d.coupon_code,d.is_coupon,d.is_active,d.channels,d.usage_count,
       COUNT(DISTINCT r.order_id)::int uses,
       COUNT(DISTINCT r.customer_id)::int customers,
       COALESCE(SUM(r.amount),0) discount_given,
       COALESCE(SUM(o.subtotal),0) gross_sales,
       COALESCE(SUM(o.total),0) net_sales,
       COUNT(DISTINCT r.order_id) FILTER(WHERE o.order_number LIKE 'WEB-%')::int ecommerce_uses,
       COUNT(DISTINCT r.order_id) FILTER(WHERE o.order_number NOT LIKE 'WEB-%')::int pos_uses,
       COALESCE(SUM(o.total) FILTER(WHERE o.order_number LIKE 'WEB-%'),0) ecommerce_sales,
       COALESCE(SUM(o.total) FILTER(WHERE o.order_number NOT LIKE 'WEB-%'),0) pos_sales,
       MAX(r.created_at) last_used_at
       FROM discounts d LEFT JOIN discount_redemptions r ON r.discount_id=d.id
       LEFT JOIN sales_orders o ON o.id=r.order_id
       WHERE d.company_id=$1 GROUP BY d.id ORDER BY net_sales DESC,d.created_at DESC`,[companyId]);
    return result.rows;
  }

  async validateCoupon(companyId: string, code: string, orderAmount: number, customerId?: string, channel='pos') {
    await this.ensureLoyaltySchema();
    const result = await this.db.query(
      `SELECT * FROM discounts WHERE company_id=$1 AND coupon_code=$2 AND is_active=true
       AND (valid_from IS NULL OR valid_from <= NOW())
       AND (valid_until IS NULL OR valid_until >= NOW())
       AND (usage_limit IS NULL OR usage_count < usage_limit)`,
      [companyId, String(code||'').trim().toUpperCase()],
    );
    if (!result.rows[0]) throw new BadRequestException('Invalid or expired coupon');
    const d = result.rows[0];
    if(!(d.channels||['pos','ecommerce']).includes(channel))
      throw new BadRequestException(`Coupon is not available on ${channel==='ecommerce'?'E-commerce':'POS'}`);
    if (orderAmount < (d.min_order_amount ?? 0))
      throw new BadRequestException(`Minimum order amount is ${d.min_order_amount} SAR`);
    if(d.first_order_only&&customerId){
      const orders=await this.db.query(`SELECT 1 FROM sales_orders WHERE company_id=$1 AND customer_id=$2 AND status='paid' LIMIT 1`,[companyId,customerId]);
      if(orders.rows[0])throw new BadRequestException('Coupon is valid for the first order only');
    }
    if(d.one_per_customer&&customerId){
      const used=await this.db.query(`SELECT 1 FROM discount_redemptions WHERE discount_id=$1 AND customer_id=$2 LIMIT 1`,[d.id,customerId]);
      if(used.rows[0])throw new BadRequestException('Coupon has already been used by this customer');
    }
    const discountAmt = d.type === 'percentage'
      ? (orderAmount * d.value) / 100
      : Math.min(d.value, orderAmount);
    return { discount: d, discount_amount: discountAmt };
  }

  async getGiftCards(companyId:string){
    await this.ensureLoyaltySchema();
    return (await this.db.query(`SELECT * FROM gift_cards WHERE company_id=$1 ORDER BY created_at DESC`,[companyId])).rows;
  }
  async createGiftCard(companyId:string,userId:string,dto:any){
    await this.ensureLoyaltySchema();
    const code=String(dto.code||'').trim().toUpperCase();
    const balance=Number(dto.balance);
    if(!code||!Number.isFinite(balance)||balance<=0)throw new BadRequestException('Code and a positive balance are required');
    const r=await this.db.query(
      `INSERT INTO gift_cards(company_id,code,original_balance,balance,recipient_name,recipient_email,expires_at,is_active,created_by)
       VALUES($1,$2,$3,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [companyId,code,balance,dto.recipient_name||null,dto.recipient_email||null,dto.expires||null,dto.is_active!==false,userId]);
    await this.db.query(`INSERT INTO gift_card_transactions(gift_card_id,type,amount,balance_after,created_by,notes) VALUES($1,'issue',$2,$2,$3,'Gift card issued')`,[r.rows[0].id,balance,userId]);
    return r.rows[0];
  }
  async updateGiftCard(companyId:string,id:string,dto:any){
    await this.ensureLoyaltySchema();
    const r=await this.db.query(`UPDATE gift_cards SET is_active=COALESCE($1,is_active),expires_at=COALESCE($2,expires_at),updated_at=NOW() WHERE id=$3 AND company_id=$4 RETURNING *`,[dto.is_active,dto.expires||null,id,companyId]);
    if(!r.rows[0])throw new NotFoundException('Gift card not found');
    return r.rows[0];
  }

  // ─── Orders ──────────────────────────────────────────────────────────────────

  async createOrder(companyId: string, userId: string, dto: CreateOrderDto) {
    await this.ensureLoyaltySchema();
    if (!dto.customer_id) throw new BadRequestException('Customer name and phone are required');
    const customer = await this.db.query(
      `SELECT id FROM customers WHERE id=$1 AND company_id=$2 AND is_active=true
       AND NULLIF(TRIM(name),'') IS NOT NULL AND NULLIF(TRIM(phone),'') IS NOT NULL`,
      [dto.customer_id, companyId],
    );
    if (!customer.rows[0]) throw new BadRequestException('Select a customer with both name and phone');
    if (!dto.pos_session_id) throw new BadRequestException('Start a POS shift before creating a sale');
    const activeSession = await this.db.query(
      `SELECT id,warehouse_id FROM pos_sessions WHERE id=$1 AND company_id=$2 AND cashier_id=$3 AND status='open'`,
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

    // Calculate order-level discounts. Coupon prices are always calculated from
    // the server record; the browser is never trusted for coupon value or rules.
    let orderDiscountTotal = 0;
    const processedDiscounts: any[] = [];
    for (const d of dto.discounts ?? []) {
      let amt = 0;
      if (d.coupon_code && d.type === 'coupon') {
        const validated=await this.validateCoupon(companyId,d.coupon_code,subtotal,dto.customer_id);
        const rule=validated.discount;
        if(rule.applies_to==='tier'){
          const tier=await this.db.query(`SELECT loyalty_tier FROM customers WHERE id=$1 AND company_id=$2`,[dto.customer_id,companyId]);
          if(!(rule.tier_restriction||[]).includes(tier.rows[0]?.loyalty_tier||'regular'))
            throw new BadRequestException('Coupon is not available for this customer tier');
        }
        amt=Math.min(Number(validated.discount_amount),subtotal-orderDiscountTotal);
        processedDiscounts.push({discount_id:rule.id,name:rule.name,type:'coupon',value:Number(rule.value),amount:amt,coupon_code:rule.coupon_code});
      } else {
        // Manual discounts remain possible for authorised POS workflows.
        if (d.type === 'percentage') amt = (subtotal * Math.min(Number(d.value),100)) / 100;
        else if (d.type === 'fixed_amount') amt = Math.min(Number(d.value), subtotal);
        processedDiscounts.push({ ...d, amount: amt });
      }
      orderDiscountTotal += amt;
    }

    const taxableAmount = Math.max(0, subtotal - orderDiscountTotal);
    const taxAmount = taxableAmount * 0.15;
    const total = taxableAmount + taxAmount;
    const warehouseId=activeSession.rows[0].warehouse_id;
    const branch=await this.db.query(
      `SELECT invoice_prefix FROM branches WHERE company_id=$1 AND warehouse_id=$2 AND is_active=true`,
      [companyId,warehouseId],
    ).catch(()=>({rows:[]} as any));
    const prefix=String(branch.rows[0]?.invoice_prefix||'ORD').replace(/[^A-Za-z0-9-]/g,'').toUpperCase();
    const orderNumber = `${prefix}-${Date.now()}`;

    // Insert order
    const orderResult = await this.db.query(
      `INSERT INTO sales_orders
         (company_id,order_number,pos_session_id,warehouse_id,cashier_id,customer_id,
          status,subtotal,discount_amount,tax_amount,total,notes)
       VALUES ($1,$2,$3,$4,$5,$6,'confirmed',$7,$8,$9,$10,$11) RETURNING *`,
      [companyId, orderNumber, dto.pos_session_id ?? null, warehouseId,
       userId, dto.customer_id ?? null, subtotal, orderDiscountTotal, taxAmount, total, dto.notes ?? null],
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
        [line.quantity, warehouseId, line.variant_id],
      );
      await this.db.query(
        `INSERT INTO stock_movements (warehouse_id,variant_id,movement_type,quantity,quantity_before,quantity_after,reason,created_by)
         SELECT $1,$2,'sale',$3,quantity+$3,quantity,$4,$5 FROM inventory
         WHERE warehouse_id=$1 AND variant_id=$2`,
        [warehouseId, line.variant_id, -line.quantity, `Order ${orderNumber}`, userId],
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
        await this.db.query(
          `INSERT INTO discount_redemptions(company_id,discount_id,customer_id,order_id,amount)
           VALUES($1,$2,$3,$4,$5)`,
          [companyId,d.discount_id,dto.customer_id??null,order.id,d.amount],
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

    let unallocatedChange=changeDue;
    for (const p of dto.payments) {
      const payment=await this.db.query(
        `INSERT INTO payments (order_id,method,amount,reference) VALUES ($1,$2,$3,$4) RETURNING id`,
        [dto.order_id, p.method, p.amount, p.reference ?? null],
      );
      const changeFromThis=p.method==='cash'?Math.min(unallocatedChange,p.amount):0;
      unallocatedChange-=changeFromThis;
      await this.postBranchAccount(companyId,order.rows[0].warehouse_id,p.method,p.amount-changeFromThis,'credit','payment',payment.rows[0].id,`Sale ${order.rows[0].order_number}`);
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
    await this.postBranchAccount(companyId,order.rows[0].warehouse_id,dto.refund_method,totalRefund,'debit','return',ret_id,`Return ${returnNumber}`);

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
