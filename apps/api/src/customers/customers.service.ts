import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { AddAddressDto } from './dto/add-address.dto';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { AdjustLoyaltyDto } from './dto/adjust-loyalty.dto';

@Injectable()
export class CustomersService {
  constructor(private db: DatabaseService) {}

  // ── Customers ──────────────────────────────────────────────────────────────

  async create(companyId: string, dto: CreateCustomerDto) {
    const result = await this.db.query(
      `INSERT INTO customers (company_id,name,phone,email,tier,notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [companyId, dto.name, dto.phone ?? null, dto.email ?? null,
       dto.tier ?? 'regular', dto.notes ?? null],
    );
    return result.rows[0];
  }

  async findAll(companyId: string, search?: string, tier?: string) {
    const conditions = ['c.company_id=$1', 'c.is_active=true'];
    const params: any[] = [companyId];
    let idx = 2;
    if (search) {
      conditions.push(`(c.name ILIKE $${idx} OR c.phone ILIKE $${idx} OR c.email ILIKE $${idx})`);
      params.push(`%${search}%`); idx++;
    }
    if (tier) { conditions.push(`c.tier=$${idx}`); params.push(tier); idx++; }
    const result = await this.db.query(
      `SELECT c.*,
         COUNT(DISTINCT so.id) as order_count,
         COALESCE(SUM(so.total) FILTER (WHERE so.status='paid'), 0) as lifetime_value
       FROM customers c
       LEFT JOIN sales_orders so ON so.customer_id=c.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY c.id
       ORDER BY c.name`,
      params,
    );
    return result.rows;
  }

  async findOne(companyId: string, id: string) {
    const result = await this.db.query(
      `SELECT c.*,
         COUNT(DISTINCT so.id) as order_count,
         COALESCE(SUM(so.total) FILTER (WHERE so.status='paid'), 0) as lifetime_value
       FROM customers c
       LEFT JOIN sales_orders so ON so.customer_id=c.id
       WHERE c.id=$1 AND c.company_id=$2
       GROUP BY c.id`,
      [id, companyId],
    );
    if (!result.rows[0]) throw new NotFoundException('Customer not found');
    return result.rows[0];
  }

  async update(companyId: string, id: string, dto: UpdateCustomerDto) {
    const fields: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (dto.name !== undefined)      { fields.push(`name=$${idx++}`);      params.push(dto.name); }
    if (dto.phone !== undefined)     { fields.push(`phone=$${idx++}`);     params.push(dto.phone); }
    if (dto.email !== undefined)     { fields.push(`email=$${idx++}`);     params.push(dto.email); }
    if (dto.tier !== undefined)      { fields.push(`tier=$${idx++}`);      params.push(dto.tier); }
    if (dto.notes !== undefined)     { fields.push(`notes=$${idx++}`);     params.push(dto.notes); }
    if (dto.is_active !== undefined) { fields.push(`is_active=$${idx++}`); params.push(dto.is_active); }
    if (!fields.length) throw new BadRequestException('Nothing to update');
    fields.push(`updated_at=NOW()`);
    params.push(id, companyId);
    const result = await this.db.query(
      `UPDATE customers SET ${fields.join(',')} WHERE id=$${idx++} AND company_id=$${idx} RETURNING *`,
      params,
    );
    if (!result.rows[0]) throw new NotFoundException('Customer not found');
    return result.rows[0];
  }

  async getOrderHistory(companyId: string, customerId: string) {
    const result = await this.db.query(
      `SELECT o.id, o.order_number, o.status, o.total, o.created_at,
         COUNT(l.id) as item_count
       FROM sales_orders o
       LEFT JOIN sales_order_lines l ON l.order_id=o.id
       WHERE o.customer_id=$1 AND o.company_id=$2
       GROUP BY o.id ORDER BY o.created_at DESC`,
      [customerId, companyId],
    );
    return result.rows;
  }

  // ── Addresses ─────────────────────────────────────────────────────────────

  async addAddress(companyId: string, customerId: string, dto: AddAddressDto) {
    await this.findOne(companyId, customerId);
    if (dto.is_default) {
      await this.db.query(
        `UPDATE customer_addresses SET is_default=false WHERE customer_id=$1`, [customerId],
      );
    }
    const result = await this.db.query(
      `INSERT INTO customer_addresses (customer_id,label,address_line1,address_line2,city,region,postal_code,is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [customerId, dto.label ?? 'home', dto.address_line1, dto.address_line2 ?? null,
       dto.city ?? null, dto.region ?? null, dto.postal_code ?? null, dto.is_default ?? false],
    );
    return result.rows[0];
  }

  async getAddresses(companyId: string, customerId: string) {
    await this.findOne(companyId, customerId);
    const result = await this.db.query(
      `SELECT * FROM customer_addresses WHERE customer_id=$1 ORDER BY is_default DESC, created_at`,
      [customerId],
    );
    return result.rows;
  }

  // ── Interactions (CRM) ────────────────────────────────────────────────────

  async addInteraction(companyId: string, staffId: string, customerId: string, dto: CreateInteractionDto) {
    await this.findOne(companyId, customerId);
    const result = await this.db.query(
      `INSERT INTO customer_interactions (customer_id,company_id,staff_id,type,subject,body)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [customerId, companyId, staffId, dto.type, dto.subject ?? null, dto.body],
    );
    return result.rows[0];
  }

  async getInteractions(companyId: string, customerId: string) {
    const result = await this.db.query(
      `SELECT i.*, u.name as staff_name
       FROM customer_interactions i
       JOIN users u ON u.id=i.staff_id
       WHERE i.customer_id=$1 AND i.company_id=$2
       ORDER BY i.created_at DESC`,
      [customerId, companyId],
    );
    return result.rows;
  }

  // ── Loyalty Points ────────────────────────────────────────────────────────

  async adjustLoyalty(companyId: string, staffId: string, customerId: string, dto: AdjustLoyaltyDto) {
    const customer = await this.findOne(companyId, customerId);
    const currentPoints = parseInt(customer.loyalty_points) || 0;
    let pointsDelta = dto.points;
    if (dto.type === 'redeem') {
      pointsDelta = -Math.abs(dto.points);
      if (currentPoints + pointsDelta < 0)
        throw new BadRequestException(`Insufficient points. Available: ${currentPoints}`);
    }
    const newBalance = currentPoints + pointsDelta;
    await this.db.query(
      `UPDATE customers SET loyalty_points=$1, updated_at=NOW() WHERE id=$2`,
      [newBalance, customerId],
    );
    const result = await this.db.query(
      `INSERT INTO loyalty_transactions (customer_id,company_id,type,points,balance_after,notes,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [customerId, companyId, dto.type, pointsDelta, newBalance, dto.notes ?? null, staffId],
    );
    return { ...result.rows[0], new_balance: newBalance };
  }

  async getLoyaltyHistory(companyId: string, customerId: string) {
    const result = await this.db.query(
      `SELECT lt.*, u.name as created_by_name
       FROM loyalty_transactions lt
       LEFT JOIN users u ON u.id=lt.created_by
       WHERE lt.customer_id=$1 AND lt.company_id=$2
       ORDER BY lt.created_at DESC`,
      [customerId, companyId],
    );
    return result.rows;
  }

  // ── Segments / Analytics ──────────────────────────────────────────────────

  async getSegments(companyId: string) {
    const result = await this.db.query(
      `SELECT
         tier,
         COUNT(*) as count,
         COALESCE(AVG(total_spent),0) as avg_spent,
         COALESCE(SUM(total_spent),0) as total_spent,
         COALESCE(AVG(loyalty_points),0) as avg_points
       FROM customers
       WHERE company_id=$1 AND is_active=true
       GROUP BY tier ORDER BY avg_spent DESC`,
      [companyId],
    );
    return result.rows;
  }
}
