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

  // ── Sales Reports ──────────────────────────────────────────────────────────

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

  async getSalesByCategory(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT c.name as category,
              SUM(sol.quantity) as qty_sold,
              SUM(sol.line_total) as revenue,
              COUNT(DISTINCT so.id) as orders
       FROM sales_order_lines sol
       JOIN product_variants pv ON pv.id=sol.variant_id
       JOIN products p ON p.id=pv.product_id
       JOIN categories c ON c.id=p.category_id
       JOIN sales_orders so ON so.id=sol.order_id
       WHERE so.company_id=$1 AND so.status='paid'
       AND so.created_at::date BETWEEN $2 AND $3
       GROUP BY c.name ORDER BY revenue DESC`, [companyId, from, to]);
    return result.rows;
  }

  async getSalesByStaff(companyId: string, from: string, to: string) {
    const result = await this.db.query(
      `SELECT u.name as staff,
              COUNT(so.id) as orders,
              COALESCE(SUM(so.total),0) as revenue,
              COALESCE(AVG(so.total),0) as avg_order_value
       FROM sales_orders so
       JOIN users u ON u.id=so.cashier_id
       WHERE so.company_id=$1 AND so.status='paid'
       AND so.created_at::date BETWEEN $2 AND $3
       GROUP BY u.name ORDER BY revenue DESC`, [companyId, from, to]);
    return result.rows;
  }

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

  // ── Inventory Reports ──────────────────────────────────────────────────────

  async getInventoryValuation(companyId: string) {
    const result = await this.db.query(
      `SELECT c.name as category,
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

  async getStockMovementReport(companyId: string, from: string, to: string, variantId?: string) {
    const conditions = ['p.company_id=$1', 'sm.created_at::date BETWEEN $2 AND $3'];
    const params: any[] = [companyId, from, to];
    if (variantId) { conditions.push('sm.variant_id=$4'); params.push(variantId); }
    const result = await this.db.query(
      `SELECT sm.movement_type, sm.quantity, sm.notes,
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

  // ── Customer Reports ───────────────────────────────────────────────────────

  async getCustomerReport(companyId: string, from: string, to: string) {
    const top = await this.db.query(
      `SELECT c.name, c.phone, c.loyalty_tier,
              COUNT(so.id) as orders,
              COALESCE(SUM(so.total),0) as lifetime_value,
              MAX(so.created_at)::date as last_purchase
       FROM customers c
       LEFT JOIN sales_orders so ON so.customer_id=c.id
         AND so.status='paid' AND so.created_at::date BETWEEN $2 AND $3
       WHERE c.company_id=$1
       GROUP BY c.id, c.name, c.phone, c.loyalty_tier
       HAVING COUNT(so.id) > 0
       ORDER BY lifetime_value DESC LIMIT 50`, [companyId, from, to]);

    const tiers = await this.db.query(
      `SELECT loyalty_tier, COUNT(*) as count,
              AVG(loyalty_points) as avg_points
       FROM customers WHERE company_id=$1
       GROUP BY loyalty_tier`, [companyId]);

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

  // ── Purchasing Reports ─────────────────────────────────────────────────────

  async getPurchasingReport(companyId: string, from: string, to: string) {
    const bySupplier = await this.db.query(
      `SELECT s.name as supplier,
              COUNT(po.id) as orders,
              COALESCE(SUM(po.total),0) as spend,
              COALESCE(SUM(po.tax_amount),0) as vat_paid
       FROM purchase_orders po
       JOIN suppliers s ON s.id=po.supplier_id
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

  // ── HR Reports ─────────────────────────────────────────────────────────────

  async getHrReport(companyId: string, from: string, to: string) {
    const headcount = await this.db.query(
      `SELECT d.name as department, COUNT(e.id) as headcount,
              SUM(e.basic_salary) as salary_budget
       FROM employees e
       JOIN departments d ON d.id=e.department_id
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
}
