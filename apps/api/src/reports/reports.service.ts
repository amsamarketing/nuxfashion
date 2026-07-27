import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ReportsService {
  constructor(private db: DatabaseService) {}

  // ── Executive Dashboard ────────────────────────────────────────────────────
  async getDashboard(companyId: string) {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.slice(0, 7) + '-01';
    const [todaySales, monthSales, inventory, customers, lowStock, openOrders] = await Promise.all([
      this.db.query(
        `SELECT COUNT(*) as orders, COALESCE(SUM(total),0) as revenue,
                COALESCE(SUM(tax_amount),0) as vat
         FROM sales_orders WHERE company_id=$1 AND status='paid'
         AND created_at::date=$2`, [companyId, today]),
      this.db.query(
        `SELECT COUNT(*) as orders, COALESCE(SUM(total),0) as revenue,
                COALESCE(SUM(discount_amount),0) as discounts
         FROM sales_orders WHERE company_id=$1 AND status='paid'
         AND created_at::date >= $2`, [companyId, monthStart]),
      this.db.query(
        `SELECT COUNT(*) as variants,
                COALESCE(SUM(i.quantity * pv.cost_price),0) as value
         FROM inventory i
         JOIN product_variants pv ON pv.id=i.variant_id
         JOIN products p ON p.id=pv.product_id
         WHERE p.company_id=$1`, [companyId]),
      this.db.query(
        `SELECT COUNT(*) as total,
                COUNT(*) FILTER (WHERE created_at::date >= $2) as new_this_month
         FROM customers WHERE company_id=$1`, [companyId, monthStart]),
      this.db.query(
        `SELECT COUNT(*) as count FROM inventory i
         JOIN product_variants pv ON pv.id=i.variant_id
         JOIN products p ON p.id=pv.product_id
         WHERE p.company_id=$1 AND i.quantity <= i.reorder_point`, [companyId]),
      this.db.query(
        `SELECT COUNT(*) as count FROM purchase_orders
         WHERE company_id=$1 AND status IN ('draft','sent','partially_received')`, [companyId]),
    ]);
    return {
      today: todaySales.rows[0],
      this_month: monthSales.rows[0],
      inventory: inventory.rows[0],
      customers: customers.rows[0],
      alerts: {
        low_stock_variants: parseInt(lowStock.rows[0].count),
        open_purchase_orders: parseInt(openOrders.rows[0].count),
      },
    };
  }

  // ── Sales: By Period ───────────────────────────────────────────────────────
  async getSalesByPeriod(companyId: string, groupBy: string, from: string, to: string) {
    const trunc = groupBy === 'month' ? 'month' : groupBy === 'week' ? 'week' : 'day';
    const result = await this.db.query(
      `SELECT DATE_TRUNC('${trunc}', created_at)::date as period,
              COUNT(*) as orders,
              COALESCE(SUM(subtotal),0) as subtotal,
              COALESCE(SUM(discount_amount),0) as discounts,
              COALESCE(SUM(tax_amount),0) as vat,
              COALESCE(SUM(total),0) as revenue
       FROM sales_orders
       WHERE company_id=$1 AND status='paid'
       AND created_at::date BETWEEN $2 AND $3
       GROUP BY 1 ORDER BY 1`, [companyId, from, to]);
    return result.rows;
  }

  // ── Sales: By Branch ──────────────────────────────────────────────────────
  async getSalesByBranch(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT COALESCE(w.name,'Unknown') as branch,
              COUNT(so.id) as orders,
              COALESCE(SUM(so.total),0) as revenue,
              COALESCE(AVG(so.total),0) as avg_order,
              COALESCE(SUM(so.discount_amount),0) as discounts,
              COALESCE(SUM(so.tax_amount),0) as vat
       FROM sales_orders so
       LEFT JOIN warehouses w ON w.id=so.warehouse_id
       WHERE so.company_id=$1 AND so.status='paid'
       AND so.created_at::date BETWEEN $2 AND $3
       GROUP BY w.name ORDER BY revenue DESC`, [companyId, from, to]);
    return result.rows;
  }

  // ── Sales: By Cashier ─────────────────────────────────────────────────────
  async getSalesByStaff(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT COALESCE(u.name,'Unknown') as staff,
              COUNT(so.id) as orders,
              COALESCE(SUM(so.total),0) as revenue,
              COALESCE(AVG(so.total),0) as avg_order_value,
              COALESCE(SUM(so.discount_amount),0) as discounts
       FROM sales_orders so
       LEFT JOIN users u ON u.id=so.cashier_id
       WHERE so.company_id=$1 AND so.status='paid'
       AND so.created_at::date BETWEEN $2 AND $3
       GROUP BY u.name ORDER BY revenue DESC`, [companyId, from, to]);
    return result.rows;
  }

  // ── Sales: By Category ────────────────────────────────────────────────────
  async getSalesByCategory(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT COALESCE(c.name,'Uncategorised') as category,
              SUM(sol.quantity) as qty_sold,
              SUM(sol.line_total) as revenue,
              COUNT(DISTINCT so.id) as orders
       FROM sales_order_lines sol
       JOIN product_variants pv ON pv.id=sol.variant_id
       JOIN products p ON p.id=pv.product_id
       LEFT JOIN categories c ON c.id=p.category_id
       JOIN sales_orders so ON so.id=sol.order_id
       WHERE so.company_id=$1 AND so.status='paid'
       AND so.created_at::date BETWEEN $2 AND $3
       GROUP BY c.name ORDER BY revenue DESC`, [companyId, from, to]);
    return result.rows;
  }

  // ── Sales: By Brand ───────────────────────────────────────────────────────
  async getSalesByBrand(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT COALESCE(b.name,'No Brand') as brand,
              SUM(sol.quantity) as qty_sold,
              SUM(sol.line_total) as revenue,
              COUNT(DISTINCT so.id) as orders,
              COUNT(DISTINCT p.id) as products
       FROM sales_order_lines sol
       JOIN product_variants pv ON pv.id=sol.variant_id
       JOIN products p ON p.id=pv.product_id
       LEFT JOIN brands b ON b.id=p.brand_id
       JOIN sales_orders so ON so.id=sol.order_id
       WHERE so.company_id=$1 AND so.status='paid'
       AND so.created_at::date BETWEEN $2 AND $3
       GROUP BY b.name ORDER BY revenue DESC`, [companyId, from, to]);
    return result.rows;
  }

  // ── Sales: Hourly Heatmap ─────────────────────────────────────────────────
  async getHourlyHeatmap(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT EXTRACT(DOW FROM created_at)::int as dow,
              EXTRACT(HOUR FROM created_at)::int as hour,
              COUNT(*) as orders,
              COALESCE(SUM(total),0) as revenue
       FROM sales_orders
       WHERE company_id=$1 AND status='paid'
       AND created_at::date BETWEEN $2 AND $3
       GROUP BY 1, 2 ORDER BY 1, 2`, [companyId, from, to]);
    return result.rows;
  }

  // ── Sales: By Channel ─────────────────────────────────────────────────────
  async getSalesByChannel(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT COALESCE(channel,'pos') as channel,
              COUNT(*) as orders,
              COALESCE(SUM(total),0) as revenue,
              COALESCE(AVG(total),0) as avg_order,
              COALESCE(SUM(discount_amount),0) as discounts
       FROM sales_orders
       WHERE company_id=$1 AND status='paid'
       AND created_at::date BETWEEN $2 AND $3
       GROUP BY 1 ORDER BY revenue DESC`, [companyId, from, to]);
    return result.rows;
  }

  // ── Sales: Discount & Coupon Impact ──────────────────────────────────────
  async getDiscountImpact(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT COALESCE(c.name,'No Coupon') as coupon,
              COALESCE(c.code,'—') as code,
              COUNT(DISTINCT so.id) as orders,
              COALESCE(SUM(so.discount_amount),0) as total_discount,
              COALESCE(SUM(so.total),0) as revenue,
              COALESCE(AVG(so.discount_amount / NULLIF(so.subtotal,0) * 100),0) as avg_discount_pct
       FROM sales_orders so
       LEFT JOIN sales_order_coupons soc ON soc.order_id=so.id
       LEFT JOIN coupons c ON c.id=soc.coupon_id
       WHERE so.company_id=$1 AND so.status='paid'
       AND so.created_at::date BETWEEN $2 AND $3
       GROUP BY c.name, c.code
       ORDER BY total_discount DESC`, [companyId, from, to]);
    return result.rows;
  }

  // ── Sales: Products ───────────────────────────────────────────────────────
  async getSalesByProduct(companyId: string, from: string, to: string, limit = 20) {
    const result = await this.db.query(
      `SELECT p.name as product, pv.sku, pv.name as variant,
              SUM(sol.quantity) as qty_sold,
              SUM(sol.line_total) as revenue,
              SUM(sol.discount_amount) as discounts
       FROM sales_order_lines sol
       JOIN product_variants pv ON pv.id=sol.variant_id
       JOIN products p ON p.id=pv.product_id
       JOIN sales_orders so ON so.id=sol.order_id
       WHERE so.company_id=$1 AND so.status='paid'
       AND so.created_at::date BETWEEN $2 AND $3
       GROUP BY p.name, pv.sku, pv.name
       ORDER BY revenue DESC LIMIT $4`, [companyId, from, to, limit]);
    return result.rows;
  }

  // ── Sales: Payment Methods ────────────────────────────────────────────────
  async getPaymentMethodBreakdown(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT p.method,
              COUNT(*) as transactions,
              COALESCE(SUM(p.amount),0) as total
       FROM payments p
       JOIN sales_orders so ON so.id=p.order_id
       WHERE so.company_id=$1 AND p.status='completed'
       AND p.paid_at::date BETWEEN $2 AND $3
       GROUP BY p.method ORDER BY total DESC`, [companyId, from, to]);
    return result.rows;
  }

  // ── Inventory: Stock on Hand ──────────────────────────────────────────────
  async getStockOnHand(companyId: string) {
    const result = await this.db.query(
      `SELECT w.name as location,
              COALESCE(c.name,'Uncategorised') as category,
              p.name as product, pv.sku,
              COALESCE(pv.name,'') as variant,
              i.quantity,
              i.reorder_point,
              pv.cost_price,
              pv.selling_price,
              (i.quantity * pv.cost_price) as cost_value,
              (i.quantity * pv.selling_price) as retail_value
       FROM inventory i
       JOIN product_variants pv ON pv.id=i.variant_id
       JOIN products p ON p.id=pv.product_id
       JOIN warehouses w ON w.id=i.warehouse_id
       LEFT JOIN categories c ON c.id=p.category_id
       WHERE p.company_id=$1 AND i.quantity > 0
       ORDER BY w.name, c.name, p.name`, [companyId]);
    const summary = await this.db.query(
      `SELECT w.name as location,
              COUNT(DISTINCT pv.id) as skus,
              SUM(i.quantity) as units,
              SUM(i.quantity * pv.cost_price) as cost_value
       FROM inventory i
       JOIN product_variants pv ON pv.id=i.variant_id
       JOIN products p ON p.id=pv.product_id
       JOIN warehouses w ON w.id=i.warehouse_id
       WHERE p.company_id=$1
       GROUP BY w.name ORDER BY cost_value DESC`, [companyId]);
    return { items: result.rows, by_location: summary.rows };
  }

  // ── Inventory: Valuation (COGS) ───────────────────────────────────────────
  async getInventoryValuation(companyId: string) {
    const result = await this.db.query(
      `SELECT COALESCE(c.name,'Uncategorised') as category,
              COUNT(DISTINCT p.id) as products,
              COUNT(pv.id) as variants,
              SUM(i.quantity) as total_units,
              SUM(i.quantity * pv.cost_price) as cost_value,
              SUM(i.quantity * pv.selling_price) as retail_value
       FROM inventory i
       JOIN product_variants pv ON pv.id=i.variant_id
       JOIN products p ON p.id=pv.product_id
       LEFT JOIN categories c ON c.id=p.category_id
       WHERE p.company_id=$1
       GROUP BY c.name ORDER BY cost_value DESC`, [companyId]);
    const totals = await this.db.query(
      `SELECT SUM(i.quantity * pv.cost_price) as total_cost,
              SUM(i.quantity * pv.selling_price) as total_retail
       FROM inventory i
       JOIN product_variants pv ON pv.id=i.variant_id
       JOIN products p ON p.id=pv.product_id
       WHERE p.company_id=$1`, [companyId]);
    return { by_category: result.rows, totals: totals.rows[0] };
  }

  // ── Inventory: Low Stock ──────────────────────────────────────────────────
  async getLowStockReport(companyId: string) {
    const result = await this.db.query(
      `SELECT p.name as product, pv.sku, pv.name as variant,
              w.name as warehouse,
              i.quantity, i.reorder_point, i.reorder_quantity,
              (i.reorder_point - i.quantity) as shortage
       FROM inventory i
       JOIN product_variants pv ON pv.id=i.variant_id
       JOIN products p ON p.id=pv.product_id
       JOIN warehouses w ON w.id=i.warehouse_id
       WHERE p.company_id=$1 AND i.quantity <= i.reorder_point
       ORDER BY shortage DESC`, [companyId]);
    return result.rows;
  }

  // ── Inventory: Stock Movements Ledger ─────────────────────────────────────
  async getStockMovementReport(companyId: string, from: string, to: string, variantId?: string) {
    const conditions = ['p.company_id=$1', 'sm.created_at::date BETWEEN $2 AND $3'];
    const params: any[] = [companyId, from, to];
    if (variantId) { conditions.push('sm.variant_id=$4'); params.push(variantId); }
    const result = await this.db.query(
      `SELECT sm.movement_type, sm.quantity, sm.notes, sm.reference,
              sm.created_at, p.name as product, pv.sku,
              w_from.name as from_warehouse, w_to.name as to_warehouse
       FROM stock_movements sm
       JOIN product_variants pv ON pv.id=sm.variant_id
       JOIN products p ON p.id=pv.product_id
       LEFT JOIN warehouses w_from ON w_from.id=sm.from_warehouse_id
       LEFT JOIN warehouses w_to ON w_to.id=sm.to_warehouse_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY sm.created_at DESC LIMIT 500`, params);
    return result.rows;
  }

  // ── Inventory: Dead Stock & Aging ─────────────────────────────────────────
  async getDeadStock(companyId: string, days = 90) {
    const result = await this.db.query(
      `SELECT p.name as product, pv.sku, COALESCE(pv.name,'') as variant,
              w.name as warehouse,
              i.quantity,
              (i.quantity * pv.cost_price) as cost_value,
              MAX(sm.created_at)::date as last_movement,
              (NOW()::date - MAX(COALESCE(sm.created_at, p.created_at))::date) as days_idle
       FROM inventory i
       JOIN product_variants pv ON pv.id=i.variant_id
       JOIN products p ON p.id=pv.product_id
       JOIN warehouses w ON w.id=i.warehouse_id
       LEFT JOIN stock_movements sm ON sm.variant_id=i.variant_id
       WHERE p.company_id=$1 AND i.quantity > 0
       GROUP BY p.name, pv.sku, pv.name, w.name, i.quantity, pv.cost_price, p.created_at
       HAVING (NOW() - MAX(COALESCE(sm.created_at, p.created_at))) > INTERVAL '${days} days'
       ORDER BY cost_value DESC LIMIT 200`, [companyId]);
    return result.rows;
  }

  // ── Inventory: Transfer History ───────────────────────────────────────────
  async getTransferHistory(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT sm.created_at, p.name as product, pv.sku,
              sm.quantity,
              w_from.name as from_location,
              w_to.name as to_location,
              sm.notes, sm.reference
       FROM stock_movements sm
       JOIN product_variants pv ON pv.id=sm.variant_id
       JOIN products p ON p.id=pv.product_id
       LEFT JOIN warehouses w_from ON w_from.id=sm.from_warehouse_id
       LEFT JOIN warehouses w_to ON w_to.id=sm.to_warehouse_id
       WHERE p.company_id=$1
       AND sm.movement_type='transfer'
       AND sm.created_at::date BETWEEN $2 AND $3
       ORDER BY sm.created_at DESC`, [companyId, from, to]);
    return result.rows;
  }

  // ── Inventory: Reorder Suggestions (rule-based) ───────────────────────────
  async getReorderSuggestions(companyId: string) {
    const result = await this.db.query(
      `SELECT p.name as product, pv.sku, COALESCE(pv.name,'') as variant,
              w.name as warehouse,
              i.quantity as current_stock,
              i.reorder_point,
              COALESCE(i.reorder_quantity, i.reorder_point * 2) as suggested_qty,
              pv.cost_price,
              (COALESCE(i.reorder_quantity, i.reorder_point * 2) * pv.cost_price) as estimated_cost,
              COALESCE(s.name,'—') as preferred_supplier,
              (i.reorder_point - i.quantity) as shortage
       FROM inventory i
       JOIN product_variants pv ON pv.id=i.variant_id
       JOIN products p ON p.id=pv.product_id
       JOIN warehouses w ON w.id=i.warehouse_id
       LEFT JOIN suppliers s ON s.id=p.preferred_supplier_id
       WHERE p.company_id=$1 AND i.quantity <= i.reorder_point
       ORDER BY shortage DESC`, [companyId]);
    return result.rows;
  }

  // ── Finance: P&L ──────────────────────────────────────────────────────────
  async getPnL(companyId: string, from: string, to: string) {
    const revenue = await this.db.query(
      `SELECT COALESCE(SUM(subtotal),0) as gross_revenue,
              COALESCE(SUM(discount_amount),0) as discounts,
              COALESCE(SUM(subtotal - discount_amount),0) as net_revenue,
              COALESCE(SUM(tax_amount),0) as vat_collected,
              COALESCE(SUM(total),0) as total_collected
       FROM sales_orders
       WHERE company_id=$1 AND status='paid'
       AND created_at::date BETWEEN $2 AND $3`, [companyId, from, to]);
    const cogs = await this.db.query(
      `SELECT COALESCE(SUM(sol.quantity * pv.cost_price),0) as cogs
       FROM sales_order_lines sol
       JOIN product_variants pv ON pv.id=sol.variant_id
       JOIN sales_orders so ON so.id=sol.order_id
       WHERE so.company_id=$1 AND so.status='paid'
       AND so.created_at::date BETWEEN $2 AND $3`, [companyId, from, to]);
    const expenses = await this.db.query(
      `SELECT COALESCE(SUM(total_net),0) as payroll,
              COALESCE(SUM(total_gosi_employer),0) as gosi
       FROM payroll_runs
       WHERE company_id=$1 AND status='paid'
       AND MAKE_DATE(period_year,period_month,1) BETWEEN $2::date AND $3::date`,
      [companyId, from, to]);
    const rev = revenue.rows[0];
    const cogsVal = parseFloat(cogs.rows[0].cogs);
    const netRev = parseFloat(rev.net_revenue);
    const grossProfit = netRev - cogsVal;
    const payroll = parseFloat(expenses.rows[0]?.payroll ?? 0);
    const gosi = parseFloat(expenses.rows[0]?.gosi ?? 0);
    const totalExpenses = payroll + gosi;
    const operatingProfit = grossProfit - totalExpenses;
    return {
      revenue: rev,
      cogs: cogsVal,
      gross_profit: grossProfit,
      gross_margin_pct: netRev > 0 ? ((grossProfit / netRev) * 100).toFixed(2) : '0',
      expenses: { payroll, gosi, total: totalExpenses },
      operating_profit: operatingProfit,
      net_profit: operatingProfit,
      net_margin_pct: netRev > 0 ? ((operatingProfit / netRev) * 100).toFixed(2) : '0',
    };
  }

  // ── Finance: VAT Return (ZATCA) ───────────────────────────────────────────
  async getVatReturn(companyId: string, from: string, to: string) {
    const sales = await this.db.query(
      `SELECT COALESCE(SUM(subtotal - discount_amount),0) as taxable_sales,
              COALESCE(SUM(tax_amount),0) as output_vat,
              COUNT(*) as invoices
       FROM sales_orders
       WHERE company_id=$1 AND status='paid'
       AND created_at::date BETWEEN $2 AND $3`, [companyId, from, to]);
    const purchases = await this.db.query(
      `SELECT COALESCE(SUM(subtotal),0) as taxable_purchases,
              COALESCE(SUM(tax_amount),0) as input_vat
       FROM purchase_orders
       WHERE company_id=$1 AND status IN ('received','partially_received')
       AND created_at::date BETWEEN $2 AND $3`, [companyId, from, to]);
    const s = sales.rows[0];
    const p = purchases.rows[0];
    const outputVat = parseFloat(s.output_vat);
    const inputVat = parseFloat(p.input_vat);
    const netVat = outputVat - inputVat;
    return {
      period: { from, to },
      sales: s,
      purchases: p,
      output_vat: outputVat,
      input_vat: inputVat,
      net_vat_payable: netVat,
      status: netVat >= 0 ? 'payable' : 'refundable',
    };
  }

  // ── Finance: BNPL Settlement ──────────────────────────────────────────────
  async getBnplSettlement(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT p.method,
              COUNT(*) as transactions,
              COALESCE(SUM(p.amount),0) as gross_amount,
              COALESCE(SUM(p.amount * 0.025),0) as estimated_fee,
              COALESCE(SUM(p.amount * 0.975),0) as net_settlement
       FROM payments p
       JOIN sales_orders so ON so.id=p.order_id
       WHERE so.company_id=$1
       AND p.method IN ('tabby','tamara','bnpl','tabby_installment','tamara_installment')
       AND p.status='completed'
       AND p.paid_at::date BETWEEN $2 AND $3
       GROUP BY p.method ORDER BY gross_amount DESC`, [companyId, from, to]);
    return result.rows;
  }

  // ── Finance: Cash Flow ────────────────────────────────────────────────────
  async getCashFlow(companyId: string, from: string, to: string) {
    const inflows = await this.db.query(
      `SELECT DATE_TRUNC('week', paid_at)::date as week,
              method,
              COALESCE(SUM(amount),0) as inflow
       FROM payments p
       JOIN sales_orders so ON so.id=p.order_id
       WHERE so.company_id=$1 AND p.status='completed'
       AND p.paid_at::date BETWEEN $2 AND $3
       GROUP BY 1, 2 ORDER BY 1`, [companyId, from, to]);
    const outflows = await this.db.query(
      `SELECT DATE_TRUNC('week', MAKE_DATE(period_year,period_month,28))::date as week,
              'payroll' as type,
              COALESCE(SUM(total_net),0) as outflow
       FROM payroll_runs
       WHERE company_id=$1 AND status='paid'
       AND MAKE_DATE(period_year,period_month,1) BETWEEN $2::date AND $3::date
       GROUP BY 1`, [companyId, from, to]);
    return { inflows: inflows.rows, outflows: outflows.rows };
  }

  // ── Finance: Bank Reconciliation ──────────────────────────────────────────
  async getBankReconciliation(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT p.method,
              DATE_TRUNC('day', p.paid_at)::date as date,
              COUNT(*) as transactions,
              COALESCE(SUM(p.amount),0) as system_total
       FROM payments p
       JOIN sales_orders so ON so.id=p.order_id
       WHERE so.company_id=$1 AND p.status='completed'
       AND p.paid_at::date BETWEEN $2 AND $3
       GROUP BY 1, 2 ORDER BY 2, 1`, [companyId, from, to]);
    return result.rows;
  }

  // ── Customers: CLV ────────────────────────────────────────────────────────
  async getCustomerCLV(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT c.name, c.phone, c.tier,
              COUNT(so.id) as total_orders,
              COALESCE(SUM(so.total),0) as lifetime_value,
              COALESCE(AVG(so.total),0) as avg_order_value,
              MIN(so.created_at)::date as first_purchase,
              MAX(so.created_at)::date as last_purchase,
              (NOW()::date - MAX(so.created_at)::date) as days_since_last,
              c.loyalty_points
       FROM customers c
       JOIN sales_orders so ON so.customer_id=c.id AND so.status='paid'
       WHERE c.company_id=$1
       AND so.created_at::date BETWEEN $2 AND $3
       GROUP BY c.id, c.name, c.phone, c.tier, c.loyalty_points
       ORDER BY lifetime_value DESC LIMIT 100`, [companyId, from, to]);
    return result.rows;
  }

  // ── Customers: New vs Returning ───────────────────────────────────────────
  async getNewVsReturning(companyId: string, from: string, to: string) {
    const weekly = await this.db.query(
      `WITH customer_orders AS (
         SELECT customer_id,
                created_at::date as order_date,
                ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at) as rn
         FROM sales_orders
         WHERE company_id=$1 AND status='paid' AND customer_id IS NOT NULL
       )
       SELECT DATE_TRUNC('week', order_date)::date as week,
              COUNT(*) FILTER (WHERE rn=1) as new_customers,
              COUNT(*) FILTER (WHERE rn>1) as returning_customers
       FROM customer_orders
       WHERE order_date BETWEEN $2 AND $3
       GROUP BY 1 ORDER BY 1`, [companyId, from, to]);
    const totals = await this.db.query(
      `WITH first_orders AS (
         SELECT customer_id, MIN(created_at)::date as first_date
         FROM sales_orders WHERE company_id=$1 AND status='paid' AND customer_id IS NOT NULL
         GROUP BY customer_id
       )
       SELECT COUNT(*) FILTER (WHERE first_date BETWEEN $2 AND $3) as new_customers,
              COUNT(*) FILTER (WHERE first_date < $2) as returning_customers
       FROM first_orders`, [companyId, from, to]);
    return { weekly: weekly.rows, totals: totals.rows[0] };
  }

  // ── Customers: Loyalty & Redemption ──────────────────────────────────────
  async getLoyaltyReport(companyId: string, from: string, to: string) {
    const tiers = await this.db.query(
      `SELECT COALESCE(tier,'regular') as tier,
              COUNT(*) as customers,
              AVG(loyalty_points) as avg_points,
              SUM(loyalty_points) as total_points
       FROM customers WHERE company_id=$1
       GROUP BY tier ORDER BY total_points DESC`, [companyId]);
    let redemptions = { rows: [] as any[] };
    try {
      redemptions = await this.db.query(
        `SELECT DATE_TRUNC('week', created_at)::date as week,
                COALESCE(SUM(points_earned),0) as earned,
                COALESCE(SUM(points_redeemed),0) as redeemed
         FROM loyalty_transactions
         WHERE company_id=$1 AND created_at::date BETWEEN $2 AND $3
         GROUP BY 1 ORDER BY 1`, [companyId, from, to]);
    } catch (_) { /* table may not exist */ }
    return { by_tier: tiers.rows, redemption_trend: redemptions.rows };
  }

  // ── Customers: RFM Segmentation (rule-based) ──────────────────────────────
  async getRfmSegmentation(companyId: string) {
    const result = await this.db.query(
      `WITH rfm AS (
         SELECT c.id, c.name, c.phone, c.tier,
                (NOW()::date - MAX(so.created_at)::date) as recency,
                COUNT(so.id) as frequency,
                COALESCE(SUM(so.total),0) as monetary
         FROM customers c
         JOIN sales_orders so ON so.customer_id=c.id AND so.status='paid'
         WHERE c.company_id=$1
         GROUP BY c.id, c.name, c.phone, c.tier
       )
       SELECT *,
         CASE
           WHEN recency <= 30  AND frequency >= 5 AND monetary >= 5000 THEN 'Champions'
           WHEN recency <= 60  AND frequency >= 3 AND monetary >= 2000 THEN 'Loyal'
           WHEN recency <= 30  AND frequency = 1                        THEN 'New Customer'
           WHEN recency <= 90  AND frequency >= 2                       THEN 'Potential Loyalist'
           WHEN recency BETWEEN 91 AND 180                              THEN 'At Risk'
           WHEN recency > 180  AND frequency >= 3                       THEN 'Can\'t Lose Them'
           WHEN recency > 180                                           THEN 'Lost'
           ELSE 'Others'
         END as segment
       FROM rfm ORDER BY monetary DESC`, [companyId]);
    const segments = result.rows.reduce((acc: any, r: any) => {
      acc[r.segment] = (acc[r.segment] || 0) + 1;
      return acc;
    }, {});
    return { customers: result.rows, segments };
  }

  // ── Customers: Cohort Retention ───────────────────────────────────────────
  async getCohortRetention(companyId: string) {
    const result = await this.db.query(
      `WITH cohorts AS (
         SELECT customer_id,
                DATE_TRUNC('month', MIN(created_at))::date as cohort_month
         FROM sales_orders WHERE company_id=$1 AND status='paid' AND customer_id IS NOT NULL
         GROUP BY customer_id
       ),
       activity AS (
         SELECT so.customer_id,
                DATE_TRUNC('month', so.created_at)::date as order_month
         FROM sales_orders so WHERE company_id=$1 AND status='paid' AND customer_id IS NOT NULL
       )
       SELECT c.cohort_month,
              EXTRACT(MONTH FROM AGE(a.order_month, c.cohort_month))::int as month_number,
              COUNT(DISTINCT a.customer_id) as customers
       FROM cohorts c
       JOIN activity a ON a.customer_id=c.customer_id AND a.order_month >= c.cohort_month
       GROUP BY 1, 2 ORDER BY 1, 2 LIMIT 200`, [companyId]);
    return result.rows;
  }

  // ── Customers: Churn Risk (rule-based) ────────────────────────────────────
  async getChurnRisk(companyId: string) {
    const result = await this.db.query(
      `WITH stats AS (
         SELECT c.id, c.name, c.phone, c.tier,
                COUNT(so.id) as total_orders,
                COALESCE(AVG(so.total),0) as avg_order,
                (NOW()::date - MAX(so.created_at)::date) as days_since_last,
                (NOW()::date - MIN(so.created_at)::date) as customer_age_days
         FROM customers c
         JOIN sales_orders so ON so.customer_id=c.id AND so.status='paid'
         WHERE c.company_id=$1
         GROUP BY c.id, c.name, c.phone, c.tier
         HAVING COUNT(so.id) >= 2
       )
       SELECT *,
         CASE
           WHEN days_since_last > 180 THEN 'High Risk'
           WHEN days_since_last BETWEEN 90 AND 180 THEN 'Medium Risk'
           ELSE 'Low Risk'
         END as churn_risk
       FROM stats
       WHERE days_since_last > 60
       ORDER BY days_since_last DESC LIMIT 100`, [companyId]);
    return result.rows;
  }

  // ── Customers: General Report ─────────────────────────────────────────────
  async getCustomerReport(companyId: string, from: string, to: string) {
    const top = await this.db.query(
      `SELECT c.name, c.phone, c.tier,
              COUNT(so.id) as orders,
              COALESCE(SUM(so.total),0) as lifetime_value,
              MAX(so.created_at)::date as last_purchase
       FROM customers c
       LEFT JOIN sales_orders so ON so.customer_id=c.id
         AND so.status='paid' AND so.created_at::date BETWEEN $2 AND $3
       WHERE c.company_id=$1
       GROUP BY c.id, c.name, c.phone, c.tier
       HAVING COUNT(so.id) > 0
       ORDER BY lifetime_value DESC LIMIT 50`, [companyId, from, to]);
    const tiers = await this.db.query(
      `SELECT COALESCE(tier,'regular') as loyalty_tier, COUNT(*) as count,
              AVG(loyalty_points) as avg_points
       FROM customers WHERE company_id=$1
       GROUP BY tier`, [companyId]);
    const retention = await this.db.query(
      `SELECT COUNT(DISTINCT customer_id) as repeat_customers
       FROM sales_orders
       WHERE company_id=$1 AND status='paid' AND customer_id IS NOT NULL
       GROUP BY customer_id HAVING COUNT(*) > 1`, [companyId]);
    return {
      top_customers: top.rows,
      by_tier: tiers.rows,
      repeat_customers: retention.rows.length,
    };
  }

  // ── Products: Best Sellers by Branch ─────────────────────────────────────
  async getBestSellersByBranch(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT COALESCE(w.name,'Unknown') as branch,
              p.name as product, pv.sku,
              SUM(sol.quantity) as qty_sold,
              SUM(sol.line_total) as revenue,
              RANK() OVER (PARTITION BY w.name ORDER BY SUM(sol.quantity) DESC) as rank
       FROM sales_order_lines sol
       JOIN product_variants pv ON pv.id=sol.variant_id
       JOIN products p ON p.id=pv.product_id
       JOIN sales_orders so ON so.id=sol.order_id
       LEFT JOIN warehouses w ON w.id=so.warehouse_id
       WHERE so.company_id=$1 AND so.status='paid'
       AND so.created_at::date BETWEEN $2 AND $3
       GROUP BY w.name, p.name, pv.sku
       ORDER BY w.name, qty_sold DESC`, [companyId, from, to]);
    return result.rows;
  }

  // ── Products: Gross Margin ────────────────────────────────────────────────
  async getGrossMarginByProduct(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT p.name as product, pv.sku,
              COALESCE(c.name,'Uncategorised') as category,
              SUM(sol.quantity) as qty,
              SUM(sol.line_total) as revenue,
              SUM(sol.quantity * pv.cost_price) as cogs,
              (SUM(sol.line_total) - SUM(sol.quantity * pv.cost_price)) as gross_profit,
              ROUND((SUM(sol.line_total) - SUM(sol.quantity * pv.cost_price))
                / NULLIF(SUM(sol.line_total),0) * 100, 2) as margin_pct
       FROM sales_order_lines sol
       JOIN product_variants pv ON pv.id=sol.variant_id
       JOIN products p ON p.id=pv.product_id
       JOIN sales_orders so ON so.id=sol.order_id
       LEFT JOIN categories c ON c.id=p.category_id
       WHERE so.company_id=$1 AND so.status='paid'
       AND so.created_at::date BETWEEN $2 AND $3
       GROUP BY p.name, pv.sku, c.name
       ORDER BY gross_profit DESC LIMIT 100`, [companyId, from, to]);
    return result.rows;
  }

  // ── Products: Return Rate by SKU ──────────────────────────────────────────
  async getReturnRateBySku(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT p.name as product, pv.sku,
              SUM(sol.quantity) as units_sold,
              COALESCE(SUM(rl.quantity),0) as units_returned,
              ROUND(COALESCE(SUM(rl.quantity),0) / NULLIF(SUM(sol.quantity),0) * 100, 2) as return_rate_pct,
              COALESCE(SUM(rl.quantity * pv.selling_price),0) as return_value
       FROM sales_order_lines sol
       JOIN product_variants pv ON pv.id=sol.variant_id
       JOIN products p ON p.id=pv.product_id
       JOIN sales_orders so ON so.id=sol.order_id
       LEFT JOIN return_lines rl ON rl.variant_id=sol.variant_id
         AND rl.created_at::date BETWEEN $2 AND $3
       WHERE so.company_id=$1 AND so.status='paid'
       AND so.created_at::date BETWEEN $2 AND $3
       GROUP BY p.name, pv.sku
       HAVING SUM(sol.quantity) > 0
       ORDER BY return_rate_pct DESC LIMIT 100`, [companyId, from, to]);
    return result.rows;
  }

  // ── Products: Markdown & Clearance ────────────────────────────────────────
  async getMarkdownReport(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT p.name as product, pv.sku,
              pv.selling_price as list_price,
              pv.cost_price,
              SUM(sol.quantity) as qty_sold,
              AVG(sol.unit_price) as avg_selling_price,
              (pv.selling_price - AVG(sol.unit_price)) as avg_markdown,
              ROUND((pv.selling_price - AVG(sol.unit_price)) / NULLIF(pv.selling_price,0) * 100, 2) as markdown_pct,
              SUM(sol.discount_amount) as total_discount_given,
              SUM(sol.line_total) as revenue
       FROM sales_order_lines sol
       JOIN product_variants pv ON pv.id=sol.variant_id
       JOIN products p ON p.id=pv.product_id
       JOIN sales_orders so ON so.id=sol.order_id
       WHERE so.company_id=$1 AND so.status='paid'
       AND so.created_at::date BETWEEN $2 AND $3
       AND sol.discount_amount > 0
       GROUP BY p.name, pv.sku, pv.selling_price, pv.cost_price
       ORDER BY total_discount_given DESC LIMIT 100`, [companyId, from, to]);
    return result.rows;
  }

  // ── Products: Bundle & Cross-sell ─────────────────────────────────────────
  async getBundlePerformance(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT so.id as order_id,
              COUNT(sol.id) as line_count,
              COALESCE(SUM(sol.line_total),0) as order_total,
              STRING_AGG(p.name, ', ' ORDER BY sol.line_total DESC) as products
       FROM sales_orders so
       JOIN sales_order_lines sol ON sol.order_id=so.id
       JOIN product_variants pv ON pv.id=sol.variant_id
       JOIN products p ON p.id=pv.product_id
       WHERE so.company_id=$1 AND so.status='paid'
       AND so.created_at::date BETWEEN $2 AND $3
       GROUP BY so.id
       HAVING COUNT(sol.id) >= 2
       ORDER BY order_total DESC LIMIT 100`, [companyId, from, to]);
    const summary = await this.db.query(
      `SELECT COUNT(*) FILTER (WHERE line_count >= 2) as multi_item_orders,
              COUNT(*) as total_orders,
              ROUND(COUNT(*) FILTER (WHERE line_count >= 2)::numeric / NULLIF(COUNT(*),0) * 100, 2) as attachment_rate
       FROM (
         SELECT so.id, COUNT(sol.id) as line_count
         FROM sales_orders so
         JOIN sales_order_lines sol ON sol.order_id=so.id
         WHERE so.company_id=$1 AND so.status='paid'
         AND so.created_at::date BETWEEN $2 AND $3
         GROUP BY so.id
       ) t`, [companyId, from, to]);
    return { orders: result.rows, summary: summary.rows[0] };
  }

  // ── Products: Price Sensitivity ───────────────────────────────────────────
  async getPriceSensitivity(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT p.name as product,
              COALESCE(c.name,'Uncategorised') as category,
              pv.selling_price as list_price,
              AVG(sol.unit_price) as avg_actual_price,
              SUM(sol.quantity) as qty_sold,
              STDDEV(sol.unit_price) as price_std_dev,
              MIN(sol.unit_price) as min_price,
              MAX(sol.unit_price) as max_price
       FROM sales_order_lines sol
       JOIN product_variants pv ON pv.id=sol.variant_id
       JOIN products p ON p.id=pv.product_id
       LEFT JOIN categories c ON c.id=p.category_id
       JOIN sales_orders so ON so.id=sol.order_id
       WHERE so.company_id=$1 AND so.status='paid'
       AND so.created_at::date BETWEEN $2 AND $3
       GROUP BY p.name, c.name, pv.selling_price
       HAVING SUM(sol.quantity) >= 5
       ORDER BY qty_sold DESC LIMIT 50`, [companyId, from, to]);
    return result.rows;
  }

  // ── HR: Attendance Summary ────────────────────────────────────────────────
  async getAttendanceSummary(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT e.name, COALESCE(d.name,'—') as department,
              COUNT(*) FILTER (WHERE a.status='present') as present,
              COUNT(*) FILTER (WHERE a.status='absent') as absent,
              COUNT(*) FILTER (WHERE a.status='late') as late,
              COUNT(*) FILTER (WHERE a.status='on_leave') as on_leave,
              ROUND(AVG(a.hours_worked)::numeric, 2) as avg_hours
       FROM attendance a
       JOIN employees e ON e.id=a.employee_id
       LEFT JOIN departments d ON d.id=e.department_id
       WHERE e.company_id=$1 AND a.date BETWEEN $2 AND $3
       GROUP BY e.name, d.name
       ORDER BY d.name, e.name`, [companyId, from, to]);
    const summary = await this.db.query(
      `SELECT COUNT(*) FILTER (WHERE a.status='present') as total_present,
              COUNT(*) FILTER (WHERE a.status='absent') as total_absent,
              COUNT(*) FILTER (WHERE a.status='late') as total_late,
              ROUND(AVG(a.hours_worked)::numeric, 2) as avg_hours
       FROM attendance a
       JOIN employees e ON e.id=a.employee_id
       WHERE e.company_id=$1 AND a.date BETWEEN $2 AND $3`, [companyId, from, to]);
    return { employees: result.rows, summary: summary.rows[0] };
  }

  // ── HR: Payroll Cost Breakdown ────────────────────────────────────────────
  async getPayrollBreakdown(companyId: string, from: string, to: string) {
    const byEmployee = await this.db.query(
      `SELECT e.name, COALESCE(d.name,'—') as department,
              pr.basic_salary, pr.housing_allowance, pr.transport_allowance,
              COALESCE(pr.commission,0) as commission,
              COALESCE(pr.overtime_pay,0) as overtime_pay,
              COALESCE(pr.deductions,0) as deductions,
              pr.total_gross, pr.total_gosi_employee, pr.total_gosi_employer,
              pr.total_net,
              pr.period_month, pr.period_year
       FROM payroll_records pr
       JOIN employees e ON e.id=pr.employee_id
       LEFT JOIN departments d ON d.id=e.department_id
       WHERE e.company_id=$1
       AND MAKE_DATE(pr.period_year, pr.period_month, 1) BETWEEN $2::date AND $3::date
       ORDER BY d.name, e.name`, [companyId, from, to]);
    const byDept = await this.db.query(
      `SELECT COALESCE(d.name,'—') as department,
              COUNT(DISTINCT e.id) as headcount,
              SUM(pr.total_gross) as gross,
              SUM(pr.total_net) as net,
              SUM(pr.total_gosi_employer) as gosi_cost
       FROM payroll_records pr
       JOIN employees e ON e.id=pr.employee_id
       LEFT JOIN departments d ON d.id=e.department_id
       WHERE e.company_id=$1
       AND MAKE_DATE(pr.period_year, pr.period_month, 1) BETWEEN $2::date AND $3::date
       GROUP BY d.name ORDER BY gross DESC`, [companyId, from, to]);
    return { by_employee: byEmployee.rows, by_department: byDept.rows };
  }

  // ── HR: Commission Report ─────────────────────────────────────────────────
  async getCommissionReport(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT COALESCE(u.name,'Unknown') as cashier,
              COUNT(so.id) as orders,
              COALESCE(SUM(so.total),0) as sales,
              COALESCE(SUM(so.total * 0.02),0) as commission_earned,
              COALESCE(AVG(so.total),0) as avg_order,
              COUNT(DISTINCT so.created_at::date) as days_worked
       FROM sales_orders so
       LEFT JOIN users u ON u.id=so.cashier_id
       WHERE so.company_id=$1 AND so.status='paid'
       AND so.created_at::date BETWEEN $2 AND $3
       GROUP BY u.name ORDER BY sales DESC`, [companyId, from, to]);
    return result.rows;
  }

  // ── HR: Top Performers ────────────────────────────────────────────────────
  async getTopPerformers(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT COALESCE(u.name,'Unknown') as cashier,
              COUNT(so.id) as orders,
              COALESCE(SUM(so.total),0) as revenue,
              COALESCE(AVG(so.total),0) as avg_order,
              COALESCE(SUM(so.discount_amount),0) as discounts_given,
              COUNT(DISTINCT so.customer_id) as unique_customers,
              RANK() OVER (ORDER BY SUM(so.total) DESC) as rank
       FROM sales_orders so
       LEFT JOIN users u ON u.id=so.cashier_id
       WHERE so.company_id=$1 AND so.status='paid'
       AND so.created_at::date BETWEEN $2 AND $3
       GROUP BY u.name ORDER BY revenue DESC`, [companyId, from, to]);
    return result.rows;
  }

  // ── HR: GOSI Contribution ─────────────────────────────────────────────────
  async getGosiReport(companyId: string, from: string, to: string) {
    const records = await this.db.query(
      `SELECT e.name, COALESCE(e.national_id,'—') as national_id,
              COALESCE(e.nationality,'—') as nationality,
              COALESCE(d.name,'—') as department,
              pr.basic_salary,
              pr.total_gosi_employee,
              pr.total_gosi_employer,
              (pr.total_gosi_employee + pr.total_gosi_employer) as total_contribution,
              pr.period_month, pr.period_year
       FROM payroll_records pr
       JOIN employees e ON e.id=pr.employee_id
       LEFT JOIN departments d ON d.id=e.department_id
       WHERE e.company_id=$1
       AND MAKE_DATE(pr.period_year, pr.period_month, 1) BETWEEN $2::date AND $3::date
       ORDER BY pr.period_year, pr.period_month, e.name`, [companyId, from, to]);
    const totals = await this.db.query(
      `SELECT SUM(pr.total_gosi_employee) as total_employee_gosi,
              SUM(pr.total_gosi_employer) as total_employer_gosi,
              COUNT(DISTINCT pr.employee_id) as employees
       FROM payroll_records pr
       JOIN employees e ON e.id=pr.employee_id
       WHERE e.company_id=$1
       AND MAKE_DATE(pr.period_year, pr.period_month, 1) BETWEEN $2::date AND $3::date`,
      [companyId, from, to]);
    return { records: records.rows, totals: totals.rows[0] };
  }

  // ── HR: WPS Log ───────────────────────────────────────────────────────────
  async getWpsLog(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT e.name,
              COALESCE(e.iban,'—') as iban,
              COALESCE(e.bank_name,'—') as bank_name,
              pr.total_net as amount,
              pr.period_month, pr.period_year,
              MAKE_DATE(pr.period_year, pr.period_month, 28)::text as payment_date,
              'WPS' as transfer_type,
              CONCAT('SAL/', pr.period_year, '/', LPAD(pr.period_month::text,2,'0'), '/', COALESCE(e.employee_number,'')) as reference
       FROM payroll_records pr
       JOIN employees e ON e.id=pr.employee_id
       WHERE e.company_id=$1
       AND MAKE_DATE(pr.period_year, pr.period_month, 1) BETWEEN $2::date AND $3::date
       ORDER BY pr.period_year, pr.period_month, e.name`, [companyId, from, to]);
    const totals = await this.db.query(
      `SELECT SUM(pr.total_net) as total_payroll,
              COUNT(DISTINCT pr.employee_id) as employees
       FROM payroll_records pr
       JOIN employees e ON e.id=pr.employee_id
       WHERE e.company_id=$1
       AND MAKE_DATE(pr.period_year, pr.period_month, 1) BETWEEN $2::date AND $3::date`,
      [companyId, from, to]);
    return { records: result.rows, totals: totals.rows[0] };
  }

  // ── HR: General Report ────────────────────────────────────────────────────
  async getHrReport(companyId: string, from: string, to: string) {
    const headcount = await this.db.query(
      `SELECT COALESCE(d.name,'—') as department, COUNT(e.id) as headcount,
              SUM(e.basic_salary) as salary_budget
       FROM employees e
       LEFT JOIN departments d ON d.id=e.department_id
       WHERE e.company_id=$1 AND e.status='active'
       GROUP BY d.name ORDER BY headcount DESC`, [companyId]);
    const attendance = await this.db.query(
      `SELECT COUNT(*) as records,
              AVG(hours_worked) as avg_hours,
              COUNT(*) FILTER (WHERE status='absent') as absences,
              COUNT(*) FILTER (WHERE status='late') as late_arrivals
       FROM attendance a
       JOIN employees e ON e.id=a.employee_id
       WHERE e.company_id=$1 AND a.date BETWEEN $2 AND $3`, [companyId, from, to]);
    const payroll = await this.db.query(
      `SELECT COUNT(*) as runs,
              COALESCE(SUM(total_gross),0) as gross,
              COALESCE(SUM(total_gosi_employee),0) as gosi_employee,
              COALESCE(SUM(total_gosi_employer),0) as gosi_employer,
              COALESCE(SUM(total_net),0) as net
       FROM payroll_runs
       WHERE company_id=$1 AND status='paid'
       AND MAKE_DATE(period_year,period_month,1) BETWEEN $2::date AND $3::date`,
      [companyId, from, to]);
    return {
      headcount_by_dept: headcount.rows,
      attendance_summary: attendance.rows[0],
      payroll_summary: payroll.rows[0],
    };
  }

  // ── Purchasing: General ───────────────────────────────────────────────────
  async getPurchasingReport(companyId: string, from: string, to: string) {
    const bySupplier = await this.db.query(
      `SELECT COALESCE(s.name,'Unknown') as supplier,
              COUNT(po.id) as orders,
              COALESCE(SUM(po.total),0) as spend,
              COALESCE(SUM(po.tax_amount),0) as vat_paid
       FROM purchase_orders po
       LEFT JOIN suppliers s ON s.id=po.supplier_id
       WHERE po.company_id=$1
       AND po.created_at::date BETWEEN $2 AND $3
       GROUP BY s.name ORDER BY spend DESC`, [companyId, from, to]);
    const byStatus = await this.db.query(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(total),0) as value
       FROM purchase_orders WHERE company_id=$1
       AND created_at::date BETWEEN $2 AND $3
       GROUP BY status`, [companyId, from, to]);
    return { by_supplier: bySupplier.rows, by_status: byStatus.rows };
  }
}
