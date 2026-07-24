import { BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class BranchesService implements OnModuleInit {
  constructor(private db: DatabaseService) {}

  async onModuleInit() {
    await this.db.query(`CREATE TABLE IF NOT EXISTS branches(
      id UUID PRIMARY KEY,
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE RESTRICT,
      code VARCHAR(30) NOT NULL,
      name VARCHAR(160) NOT NULL,
      invoice_prefix VARCHAR(20) NOT NULL,
      city VARCHAR(100),
      address TEXT,
      phone VARCHAR(40),
      manager_name VARCHAR(160),
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(company_id,code), UNIQUE(warehouse_id)
    )`);
    // Older production databases already have a legacy `branches` table.
    // CREATE TABLE IF NOT EXISTS does not add the columns introduced by this module.
    await this.db.query(`ALTER TABLE branches ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES warehouses(id) ON DELETE RESTRICT`);
    await this.db.query(`ALTER TABLE branches ADD COLUMN IF NOT EXISTS code VARCHAR(30)`);
    await this.db.query(`ALTER TABLE branches ADD COLUMN IF NOT EXISTS branch_code VARCHAR(30)`);
    await this.db.query(`ALTER TABLE branches ADD COLUMN IF NOT EXISTS invoice_prefix VARCHAR(20)`);
    await this.db.query(`ALTER TABLE branches ADD COLUMN IF NOT EXISTS city VARCHAR(100)`);
    await this.db.query(`ALTER TABLE branches ADD COLUMN IF NOT EXISTS address TEXT`);
    await this.db.query(`ALTER TABLE branches ADD COLUMN IF NOT EXISTS phone VARCHAR(40)`);
    await this.db.query(`ALTER TABLE branches ADD COLUMN IF NOT EXISTS manager_name VARCHAR(160)`);
    await this.db.query(`ALTER TABLE branches ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`);
    await this.db.query(`ALTER TABLE branches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
    await this.db.query(
      `UPDATE branches b SET warehouse_id=w.id
       FROM warehouses w
       WHERE b.warehouse_id IS NULL AND w.company_id=b.company_id
       AND LOWER(TRIM(w.name))=LOWER(TRIM(b.name))`,
    );
    await this.db.query(
      `UPDATE branches SET
       code=COALESCE(NULLIF(code,''),NULLIF(branch_code,''),'BR-'||UPPER(LEFT(id::text,4))),
       branch_code=COALESCE(NULLIF(branch_code,''),NULLIF(code,''),'BR-'||UPPER(LEFT(id::text,4))),
       invoice_prefix=COALESCE(NULLIF(invoice_prefix,''),'BR'||UPPER(LEFT(id::text,4)))`,
    );
    await this.db.query(`CREATE UNIQUE INDEX IF NOT EXISTS branches_warehouse_unique ON branches(warehouse_id) WHERE warehouse_id IS NOT NULL`);
    await this.db.query(`CREATE TABLE IF NOT EXISTS branch_user_assignments(
      branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(branch_id,user_id)
    )`);
    await this.db.query(`CREATE TABLE IF NOT EXISTS pos_employee_users(
      employee_id UUID PRIMARY KEY,
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await this.db.query(`CREATE TABLE IF NOT EXISTS branch_partners(
      id UUID PRIMARY KEY,branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      name VARCHAR(160) NOT NULL,phone VARCHAR(40),email VARCHAR(160),
      ownership_percent NUMERIC(7,4) NOT NULL DEFAULT 0,
      capital_contribution NUMERIC(16,2) NOT NULL DEFAULT 0,
      notes TEXT,is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await this.db.query(`CREATE TABLE IF NOT EXISTS branch_payment_accounts(
      id UUID PRIMARY KEY,branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      name VARCHAR(160) NOT NULL,method VARCHAR(40) NOT NULL,provider VARCHAR(120),
      account_reference VARCHAR(160),opening_balance NUMERIC(16,2) NOT NULL DEFAULT 0,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await this.db.query(`CREATE UNIQUE INDEX IF NOT EXISTS branch_payment_default_method
      ON branch_payment_accounts(branch_id,method) WHERE is_default=true AND is_active=true`);
    await this.db.query(`ALTER TABLE branch_payment_accounts ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(7,4) NOT NULL DEFAULT 0`);
    await this.db.query(`ALTER TABLE branch_payment_accounts ADD COLUMN IF NOT EXISTS fixed_fee NUMERIC(12,2) NOT NULL DEFAULT 0`);
    await this.db.query(`ALTER TABLE branch_payment_accounts ADD COLUMN IF NOT EXISTS fee_vat_rate NUMERIC(7,4) NOT NULL DEFAULT 15`);
    await this.db.query(`ALTER TABLE branch_payment_accounts ADD COLUMN IF NOT EXISTS settlement_days INTEGER NOT NULL DEFAULT 0`);
    await this.db.query(`CREATE TABLE IF NOT EXISTS branch_account_transactions(
      id UUID PRIMARY KEY,branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      account_id UUID NOT NULL REFERENCES branch_payment_accounts(id) ON DELETE RESTRICT,
      direction VARCHAR(10) NOT NULL CHECK(direction IN('credit','debit')),
      amount NUMERIC(16,2) NOT NULL CHECK(amount>0),reference_type VARCHAR(50),
      reference_id UUID,note TEXT,created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
    await this.db.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL`);
    await this.db.query(`CREATE TABLE IF NOT EXISTS branch_stock_transfers(
      id UUID PRIMARY KEY,company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      transfer_number VARCHAR(50) NOT NULL UNIQUE,from_branch_id UUID NOT NULL REFERENCES branches(id),
      to_branch_id UUID NOT NULL REFERENCES branches(id),status VARCHAR(30) NOT NULL DEFAULT 'requested',
      settlement_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',transfer_value NUMERIC(16,2) NOT NULL DEFAULT 0,
      notes TEXT,requested_by UUID REFERENCES users(id),approved_by UUID REFERENCES users(id),
      dispatched_by UUID REFERENCES users(id),received_by UUID REFERENCES users(id),
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),approved_at TIMESTAMPTZ,
      dispatched_at TIMESTAMPTZ,received_at TIMESTAMPTZ,cancelled_at TIMESTAMPTZ
    )`);
    await this.db.query(`CREATE TABLE IF NOT EXISTS branch_stock_transfer_lines(
      id UUID PRIMARY KEY,transfer_id UUID NOT NULL REFERENCES branch_stock_transfers(id) ON DELETE CASCADE,
      variant_id UUID NOT NULL REFERENCES product_variants(id),quantity INTEGER NOT NULL CHECK(quantity>0),
      received_quantity INTEGER NOT NULL DEFAULT 0,unit_cost NUMERIC(16,2) NOT NULL DEFAULT 0
    )`);
    await this.db.query(`CREATE TABLE IF NOT EXISTS interbranch_settlements(
      id UUID PRIMARY KEY,transfer_id UUID NOT NULL REFERENCES branch_stock_transfers(id) ON DELETE RESTRICT,
      payer_branch_id UUID NOT NULL REFERENCES branches(id),payee_branch_id UUID NOT NULL REFERENCES branches(id),
      payer_account_id UUID NOT NULL REFERENCES branch_payment_accounts(id),
      payee_account_id UUID NOT NULL REFERENCES branch_payment_accounts(id),
      amount NUMERIC(16,2) NOT NULL CHECK(amount>0),reference VARCHAR(160),notes TEXT,
      created_by UUID REFERENCES users(id),created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`);
  }

  private async syncWarehouses(companyId: string) {
    const missing = await this.db.query(
      `SELECT w.id,w.name
       FROM warehouses w LEFT JOIN branches b ON b.warehouse_id=w.id
       WHERE w.company_id=$1 AND b.id IS NULL ORDER BY w.created_at,w.id`, [companyId],
    );
    for (let i=0;i<missing.rows.length;i++) {
      const w:any=missing.rows[i];
      const stem=String(w.name||'BR').replace(/[^A-Za-z0-9]/g,'').slice(0,8).toUpperCase()||'BR';
      const code=`${stem}-${String(w.id).slice(0,4).toUpperCase()}`;
      await this.db.query(
        `INSERT INTO branches(id,company_id,warehouse_id,code,branch_code,name,invoice_prefix)
         SELECT $1,$2,$3,$4,$4,$5,$6
         WHERE NOT EXISTS(SELECT 1 FROM branches WHERE warehouse_id=$3)`,
        [randomUUID(),companyId,w.id,code,w.name,stem.slice(0,6)],
      );
    }
  }

  async list(companyId: string) {
    await this.syncWarehouses(companyId);
    const result=await this.db.query(
      `SELECT b.*,
        (SELECT COUNT(*)::int FROM branch_user_assignments a WHERE a.branch_id=b.id) user_count,
        (SELECT COUNT(DISTINCT i.variant_id)::int FROM inventory i WHERE i.warehouse_id=b.warehouse_id) sku_count,
        (SELECT COALESCE(SUM(i.quantity),0)::numeric FROM inventory i WHERE i.warehouse_id=b.warehouse_id) total_units,
        (SELECT COUNT(*)::int FROM sales_orders so WHERE so.warehouse_id=b.warehouse_id AND so.status='paid') order_count,
        (SELECT COALESCE(SUM(so.total),0)::numeric FROM sales_orders so WHERE so.warehouse_id=b.warehouse_id AND so.status='paid') sales_total,
        COALESCE((SELECT json_agg(jsonb_build_object('id',u.id,'name',u.name,'email',u.email))
          FROM branch_user_assignments a JOIN users u ON u.id=a.user_id WHERE a.branch_id=b.id),'[]') assigned_users
       FROM branches b WHERE b.company_id=$1
       ORDER BY b.is_active DESC,b.name`, [companyId],
    );
    return result.rows;
  }

  async mine(companyId: string,userId: string) {
    await this.syncWarehouses(companyId);
    const assigned=await this.db.query(
      `SELECT b.*,b.warehouse_id id,b.id branch_id
       FROM branches b JOIN branch_user_assignments a ON a.branch_id=b.id
       WHERE b.company_id=$1 AND a.user_id=$2 AND b.is_active=true
       ORDER BY a.is_default DESC,b.name`,[companyId,userId],
    );
    if(assigned.rows.length)return assigned.rows;
    const all=await this.db.query(
      `SELECT b.*,b.warehouse_id id,b.id branch_id FROM branches b
       WHERE b.company_id=$1 AND b.is_active=true ORDER BY b.name`,[companyId],
    );
    return all.rows;
  }

  async users(companyId:string){
    const result=await this.db.query(
      `SELECT DISTINCT u.id,u.name,u.email,u.is_active
       FROM users u JOIN user_company_roles ur ON ur.user_id=u.id
       WHERE ur.company_id=$1 AND u.deleted_at IS NULL ORDER BY u.name,u.email`,[companyId],
    );
    return result.rows;
  }

  async posEmployees(companyId:string){
    const result=await this.db.query(
      `SELECT e.id,
        COALESCE(NULLIF(to_jsonb(e)->>'full_name',''),
          NULLIF(TRIM(CONCAT(to_jsonb(e)->>'first_name',' ',to_jsonb(e)->>'last_name')),''),'Employee') full_name,
        to_jsonb(e)->>'email' email,
        COALESCE(to_jsonb(e)->>'employee_number',to_jsonb(e)->>'employee_id') employee_number,
        to_jsonb(e)->>'job_title' job_title,
        CASE WHEN pe.employee_id IS NULL THEN false ELSE true END has_pos_access
       FROM employees e
       LEFT JOIN pos_employee_users pe ON pe.employee_id=e.id AND pe.company_id=$1
       WHERE COALESCE(to_jsonb(e)->>'company_id',$1::text)=$1::text
       AND COALESCE(to_jsonb(e)->>'status','active') NOT IN('inactive','terminated')
       ORDER BY has_pos_access,full_name`,
      [companyId],
    );
    return result.rows;
  }

  async create(companyId:string,body:any){
    const name=String(body.name||'').trim();
    const code=String(body.code||'').trim().toUpperCase();
    const prefix=String(body.invoice_prefix||code).trim().toUpperCase();
    if(!name||!code||!prefix)throw new BadRequestException('Name, branch code and invoice prefix are required');
    return this.db.transaction(async client=>{
      const warehouseId=randomUUID();
      await client.query(
        `INSERT INTO warehouses(id,company_id,warehouse_code,name) VALUES($1,$2,$3,$4)`,
        [warehouseId,companyId,code,name],
      );
      const id=randomUUID();
      const result=await client.query(
        `INSERT INTO branches(id,company_id,warehouse_id,code,branch_code,name,invoice_prefix,city,address,phone,manager_name,is_active)
         VALUES($1,$2,$3,$4,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
        [id,companyId,warehouseId,code,name,prefix,body.city||null,body.address||null,body.phone||null,body.manager_name||null,body.is_active!==false],
      );
      return result.rows[0];
    });
  }

  async update(companyId:string,id:string,body:any){
    const current=await this.db.query(`SELECT * FROM branches WHERE id=$1 AND company_id=$2`,[id,companyId]);
    if(!current.rows[0])throw new NotFoundException('Branch not found');
    const b={...current.rows[0],...body};
    const result=await this.db.query(
      `UPDATE branches SET code=$1,branch_code=$1,name=$2,invoice_prefix=$3,city=$4,address=$5,phone=$6,
       manager_name=$7,is_active=$8,updated_at=NOW() WHERE id=$9 AND company_id=$10 RETURNING *`,
      [String(b.code).toUpperCase(),b.name,String(b.invoice_prefix).toUpperCase(),b.city||null,b.address||null,b.phone||null,b.manager_name||null,b.is_active!==false,id,companyId],
    );
    await this.db.query(`UPDATE warehouses SET name=$1 WHERE id=$2 AND company_id=$3`,[b.name,current.rows[0].warehouse_id,companyId]);
    return result.rows[0];
  }

  async assignUsers(companyId:string,id:string,userIds:string[]){
    const branch=await this.db.query(`SELECT id FROM branches WHERE id=$1 AND company_id=$2`,[id,companyId]);
    if(!branch.rows[0])throw new NotFoundException('Branch not found');
    const valid=await this.db.query(`SELECT DISTINCT user_id FROM user_company_roles WHERE company_id=$1 AND user_id=ANY($2::uuid[])`,[companyId,userIds]);
    return this.db.transaction(async client=>{
      await client.query(`DELETE FROM branch_user_assignments WHERE branch_id=$1`,[id]);
      for(const row of valid.rows)await client.query(
        `INSERT INTO branch_user_assignments(branch_id,user_id) VALUES($1,$2)`,[id,row.user_id],
      );
      return {success:true,assigned:valid.rows.length};
    });
  }

  async createPosUser(companyId:string,branchId:string,body:any){
    await this.ownedBranch(companyId,branchId);
    const employeeId=String(body.employee_id||'').trim();
    const password=String(body.password||'');
    if(!employeeId)throw new BadRequestException('Select an employee first');
    if(password.length<8)throw new BadRequestException('Password must contain at least 8 characters');
    const employee=await this.db.query(
      `SELECT e.id,
        COALESCE(NULLIF(to_jsonb(e)->>'full_name',''),
          NULLIF(TRIM(CONCAT(to_jsonb(e)->>'first_name',' ',to_jsonb(e)->>'last_name')),''),'Employee') full_name,
        to_jsonb(e)->>'email' email,
        COALESCE(to_jsonb(e)->>'status','active') status
       FROM employees e WHERE e.id=$1 AND COALESCE(to_jsonb(e)->>'company_id',$2)=$2`,
      [employeeId,companyId],
    );
    if(!employee.rows[0])throw new NotFoundException('Employee not found. Create the employee in HR first.');
    if(['inactive','terminated'].includes(employee.rows[0].status))throw new BadRequestException('Only active employees can receive POS access');
    const linked=await this.db.query(`SELECT user_id FROM pos_employee_users WHERE employee_id=$1`,[employeeId]);
    if(linked.rows[0])throw new ConflictException('This employee already has a POS user account');
    const name=String(employee.rows[0].full_name).trim();
    const email=String(body.email||employee.rows[0].email||'').trim().toLowerCase();
    if(!email||!email.includes('@'))throw new BadRequestException('Employee must have a valid login email');
    const exists=await this.db.query(`SELECT id FROM users WHERE LOWER(email)=LOWER($1) AND deleted_at IS NULL LIMIT 1`,[email]);
    if(exists.rows[0])throw new ConflictException('A user with this email already exists');
    const role=await this.db.query(
      `SELECT id,name FROM roles
       WHERE LOWER(REPLACE(REPLACE(name,' ','_'),'-','_'))=ANY($1::text[])
       ORDER BY CASE LOWER(REPLACE(REPLACE(name,' ','_'),'-','_'))
         WHEN 'cashier' THEN 1 WHEN 'pos_user' THEN 2 WHEN 'pos' THEN 3
         WHEN 'sales_associate' THEN 4 ELSE 5 END LIMIT 1`,
      [['cashier','pos_user','pos','sales_associate','salesperson']],
    );
    if(!role.rows[0])throw new BadRequestException('No POS/Cashier role is configured. Add a Cashier role before creating POS staff.');
    const userId=randomUUID(),passwordHash=await bcrypt.hash(password,12);
    return this.db.transaction(async client=>{
      const created=await client.query(
        `INSERT INTO users(id,email,name,password_hash,is_active)
         VALUES($1,$2,$3,$4,true)
         RETURNING id,email,name,is_active`,
        [userId,email,name,passwordHash],
      );
      await client.query(
        `INSERT INTO user_company_roles(user_id,company_id,role_id) VALUES($1,$2,$3)`,
        [userId,companyId,role.rows[0].id],
      );
      await client.query(
        `INSERT INTO branch_user_assignments(branch_id,user_id,is_default) VALUES($1,$2,true)`,
        [branchId,userId],
      );
      await client.query(
        `INSERT INTO pos_employee_users(employee_id,user_id,company_id) VALUES($1,$2,$3)`,
        [employeeId,userId,companyId],
      );
      return {...created.rows[0],employee_id:employeeId,role:role.rows[0].name,branch_id:branchId};
    });
  }

  private async ownedBranch(companyId:string,id:string){
    const row=await this.db.query(`SELECT * FROM branches WHERE id=$1 AND company_id=$2`,[id,companyId]);
    if(!row.rows[0])throw new NotFoundException('Branch not found');
    return row.rows[0];
  }

  private async ensureDefaultAccounts(branchId:string){
    const defaults=[['Branch Cash','cash'],['Card Terminal','card'],['Mada Terminal','mada'],['Tabby','tabby'],['Tamara','tamara'],['Bank Transfer','bank_transfer']];
    for(const [name,method] of defaults)await this.db.query(
      `INSERT INTO branch_payment_accounts(id,branch_id,name,method,is_default)
       SELECT $1,$2,$3,$4::varchar,true WHERE NOT EXISTS(
         SELECT 1 FROM branch_payment_accounts WHERE branch_id=$2 AND method=$4::varchar AND is_active=true)`,
      [randomUUID(),branchId,name,method],
    );
  }

  async finance(companyId:string,id:string){
    const branch=await this.ownedBranch(companyId,id);await this.ensureDefaultAccounts(id);
    const partners=await this.db.query(`SELECT * FROM branch_partners WHERE branch_id=$1 ORDER BY is_active DESC,name`,[id]);
    const accounts=await this.db.query(
      `SELECT a.*,(a.opening_balance+COALESCE(SUM(CASE WHEN t.direction='credit' THEN t.amount ELSE -t.amount END),0)) balance,
       COUNT(t.id)::int transaction_count
       FROM branch_payment_accounts a LEFT JOIN branch_account_transactions t ON t.account_id=a.id
       WHERE a.branch_id=$1 GROUP BY a.id ORDER BY a.is_active DESC,a.method,a.name`,[id]);
    const ledger=await this.db.query(
      `SELECT t.*,a.name account_name,a.method FROM branch_account_transactions t
       JOIN branch_payment_accounts a ON a.id=t.account_id WHERE t.branch_id=$1
       ORDER BY t.created_at DESC LIMIT 150`,[id]);
    const ownership=partners.rows.filter((p:any)=>p.is_active).reduce((s:number,p:any)=>s+Number(p.ownership_percent),0);
    return {branch,partners:partners.rows,accounts:accounts.rows,ledger:ledger.rows,ownership_total:ownership};
  }

  async savePartner(companyId:string,branchId:string,partnerId:string|null,body:any){
    await this.ownedBranch(companyId,branchId);
    const pct=Number(body.ownership_percent||0);
    if(!String(body.name||'').trim()||pct<0||pct>100)throw new BadRequestException('Valid partner name and ownership percentage are required');
    const other=await this.db.query(
      `SELECT COALESCE(SUM(ownership_percent),0) total FROM branch_partners
       WHERE branch_id=$1 AND is_active=true AND ($2::uuid IS NULL OR id<>$2)`,[branchId,partnerId]);
    if(body.is_active!==false&&Number(other.rows[0].total)+pct>100.0001)throw new BadRequestException('Active partner ownership cannot exceed 100%');
    if(partnerId){
      const result=await this.db.query(
        `UPDATE branch_partners SET name=$1,phone=$2,email=$3,ownership_percent=$4,capital_contribution=$5,
         notes=$6,is_active=$7,updated_at=NOW() WHERE id=$8 AND branch_id=$9 RETURNING *`,
        [body.name,body.phone||null,body.email||null,pct,Number(body.capital_contribution||0),body.notes||null,body.is_active!==false,partnerId,branchId]);
      if(!result.rows[0])throw new NotFoundException('Partner not found');return result.rows[0];
    }
    const result=await this.db.query(
      `INSERT INTO branch_partners(id,branch_id,name,phone,email,ownership_percent,capital_contribution,notes,is_active)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [randomUUID(),branchId,body.name,body.phone||null,body.email||null,pct,Number(body.capital_contribution||0),body.notes||null,body.is_active!==false]);
    return result.rows[0];
  }

  async saveAccount(companyId:string,branchId:string,accountId:string|null,body:any){
    await this.ownedBranch(companyId,branchId);
    const method=String(body.method||'').trim().toLowerCase();
    if(!String(body.name||'').trim()||!method)throw new BadRequestException('Account name and payment method are required');
    if(body.is_default)await this.db.query(`UPDATE branch_payment_accounts SET is_default=false WHERE branch_id=$1 AND method=$2`,[branchId,method]);
    if(accountId){
      const result=await this.db.query(
        `UPDATE branch_payment_accounts SET name=$1,method=$2,provider=$3,account_reference=$4,opening_balance=$5,
         is_default=$6,is_active=$7,commission_rate=$8,fixed_fee=$9,fee_vat_rate=$10,settlement_days=$11,
         updated_at=NOW() WHERE id=$12 AND branch_id=$13 RETURNING *`,
        [body.name,method,body.provider||null,body.account_reference||null,Number(body.opening_balance||0),body.is_default===true,body.is_active!==false,
         Number(body.commission_rate||0),Number(body.fixed_fee||0),Number(body.fee_vat_rate??15),Number(body.settlement_days||0),accountId,branchId]);
      if(!result.rows[0])throw new NotFoundException('Account not found');return result.rows[0];
    }
    const result=await this.db.query(
      `INSERT INTO branch_payment_accounts(id,branch_id,name,method,provider,account_reference,opening_balance,is_default,is_active,
       commission_rate,fixed_fee,fee_vat_rate,settlement_days)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [randomUUID(),branchId,body.name,method,body.provider||null,body.account_reference||null,Number(body.opening_balance||0),body.is_default===true,body.is_active!==false,
       Number(body.commission_rate||0),Number(body.fixed_fee||0),Number(body.fee_vat_rate??15),Number(body.settlement_days||0)]);
    return result.rows[0];
  }

  async adjustAccount(companyId:string,userId:string,branchId:string,accountId:string,body:any){
    await this.ownedBranch(companyId,branchId);
    const account=await this.db.query(`SELECT id FROM branch_payment_accounts WHERE id=$1 AND branch_id=$2 AND is_active=true`,[accountId,branchId]);
    if(!account.rows[0])throw new NotFoundException('Payment account not found');
    const amount=Number(body.amount||0),direction=body.direction==='debit'?'debit':'credit';
    if(amount<=0)throw new BadRequestException('Adjustment amount must be greater than zero');
    const result=await this.db.query(
      `INSERT INTO branch_account_transactions(id,branch_id,account_id,direction,amount,reference_type,note,created_by)
       VALUES($1,$2,$3,$4,$5,'adjustment',$6,$7) RETURNING *`,
      [randomUUID(),branchId,accountId,direction,amount,body.note||null,userId]);
    return result.rows[0];
  }

  private dates(from?:string,to?:string){
    const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10);
    return {from:/^\d{4}-\d{2}-\d{2}$/.test(from||'')?from!:start,to:/^\d{4}-\d{2}-\d{2}$/.test(to||'')?to!:now.toISOString().slice(0,10)};
  }

  async branchReport(companyId:string,branchId:string,from?:string,to?:string){
    const branch=await this.ownedBranch(companyId,branchId),d=this.dates(from,to);
    const sales=await this.db.query(
      `SELECT COALESCE(SUM(o.subtotal-COALESCE(o.discount_amount,0)),0) revenue,
       COALESCE(SUM(o.tax_amount),0) output_vat,COALESCE(SUM(o.total),0) gross_sales,
       COUNT(*)::int orders,COALESCE(SUM((SELECT SUM(l.quantity) FROM sales_order_lines l WHERE l.order_id=o.id)),0) units
       FROM sales_orders o WHERE o.company_id=$1 AND o.warehouse_id=$2
       AND o.status IN('paid','partial_return','refunded') AND o.created_at::date BETWEEN $3 AND $4`,
      [companyId,branch.warehouse_id,d.from,d.to]);
    const returns=await this.db.query(
      `SELECT COALESCE(SUM(r.refund_amount),0) gross_returns,
       COALESCE(SUM(r.refund_amount/1.15),0) returns_ex_vat,
       COALESCE(SUM(r.refund_amount-(r.refund_amount/1.15)),0) returned_vat
       FROM returns r JOIN sales_orders o ON o.id=r.original_order_id
       WHERE o.warehouse_id=$1 AND r.created_at::date BETWEEN $2 AND $3`,
      [branch.warehouse_id,d.from,d.to]);
    const cogs=await this.db.query(
      `SELECT COALESCE(SUM(l.quantity*pv.cost_price),0) sold_cost
       FROM sales_order_lines l JOIN sales_orders o ON o.id=l.order_id
       JOIN product_variants pv ON pv.id=l.variant_id
       WHERE o.warehouse_id=$1 AND o.status IN('paid','partial_return','refunded')
       AND o.created_at::date BETWEEN $2 AND $3`,[branch.warehouse_id,d.from,d.to]);
    const returnedCost=await this.db.query(
      `SELECT COALESCE(SUM(rl.quantity*pv.cost_price),0) returned_cost
       FROM return_lines rl JOIN returns r ON r.id=rl.return_id JOIN sales_orders o ON o.id=r.original_order_id
       JOIN product_variants pv ON pv.id=rl.variant_id WHERE o.warehouse_id=$1 AND rl.restock=true
       AND r.created_at::date BETWEEN $2 AND $3`,[branch.warehouse_id,d.from,d.to]);
    const expenses=await this.db.query(
      `SELECT COALESCE(SUM(a.amount),0)+COALESCE((SELECT SUM(t.amount) FROM branch_account_transactions t
       WHERE t.branch_id=$2 AND t.reference_type='payment_commission' AND t.created_at::date BETWEEN $3 AND $4),0) expenses,
       COALESCE(SUM(a.tax_amount),0)+COALESCE((SELECT SUM(t.amount) FROM branch_account_transactions t
       WHERE t.branch_id=$2 AND t.reference_type='payment_fee_vat' AND t.created_at::date BETWEEN $3 AND $4),0) input_vat,
       COUNT(DISTINCT e.id)::int expense_count
       FROM expense_allocations a JOIN expenses e ON e.id=a.expense_id
       WHERE e.company_id=$1 AND a.branch_id=$2 AND e.date BETWEEN $3 AND $4`,
      [companyId,branchId,d.from,d.to]);
    const stock=await this.db.query(
      `SELECT COALESCE(SUM(i.quantity*pv.cost_price),0) cost_value,COALESCE(SUM(i.quantity*pv.selling_price),0) retail_value,
       COALESCE(SUM(i.quantity),0) units FROM inventory i JOIN product_variants pv ON pv.id=i.variant_id
       WHERE i.warehouse_id=$1`,[branch.warehouse_id]);
    const accounts=await this.db.query(
      `SELECT COALESCE(SUM(a.opening_balance+COALESCE((SELECT SUM(CASE WHEN t.direction='credit' THEN t.amount ELSE -t.amount END)
       FROM branch_account_transactions t WHERE t.account_id=a.id),0)),0) balance
       FROM branch_payment_accounts a WHERE a.branch_id=$1 AND a.is_active=true`,[branchId]);
    const s:any=sales.rows[0],r:any=returns.rows[0],e:any=expenses.rows[0];
    const revenue=Number(s.revenue)-Number(r.returns_ex_vat),netCogs=Number(cogs.rows[0].sold_cost)-Number(returnedCost.rows[0].returned_cost);
    const grossProfit=revenue-netCogs,netProfit=grossProfit-Number(e.expenses);
    const partners=await this.db.query(`SELECT id,name,ownership_percent,capital_contribution FROM branch_partners WHERE branch_id=$1 AND is_active=true ORDER BY name`,[branchId]);
    return {branch,period:d,sales:{orders:s.orders,units:Number(s.units),gross:Number(s.gross_sales),returns:Number(r.gross_returns),net_revenue:revenue,output_vat:Number(s.output_vat)-Number(r.returned_vat)},cogs:netCogs,gross_profit:grossProfit,gross_margin:revenue?grossProfit/revenue*100:0,expenses:Number(e.expenses),expense_count:e.expense_count,input_vat:Number(e.input_vat),net_profit:netProfit,net_margin:revenue?netProfit/revenue*100:0,account_balance:Number(accounts.rows[0].balance),stock:{units:Number(stock.rows[0].units),cost_value:Number(stock.rows[0].cost_value),retail_value:Number(stock.rows[0].retail_value)},partners:partners.rows.map((p:any)=>({...p,profit_share:netProfit*Number(p.ownership_percent)/100}))};
  }

  async performance(companyId:string,from?:string,to?:string){
    await this.syncWarehouses(companyId);const d=this.dates(from,to);
    const branches=await this.db.query(`SELECT id FROM branches WHERE company_id=$1 AND is_active=true ORDER BY name`,[companyId]);
    const rows=[];for(const b of branches.rows)rows.push(await this.branchReport(companyId,b.id,d.from,d.to));
    const unallocated=await this.db.query(
      `SELECT COALESCE(SUM(e.amount),0) amount,COUNT(*)::int count FROM expenses e
       WHERE e.company_id=$1 AND e.date BETWEEN $2 AND $3
       AND NOT EXISTS(SELECT 1 FROM expense_allocations a WHERE a.expense_id=e.id)`,[companyId,d.from,d.to]);
    const totals=rows.reduce((a:any,x:any)=>({revenue:a.revenue+x.sales.net_revenue,cogs:a.cogs+x.cogs,gross_profit:a.gross_profit+x.gross_profit,expenses:a.expenses+x.expenses,net_profit:a.net_profit+x.net_profit,orders:a.orders+Number(x.sales.orders)}),{revenue:0,cogs:0,gross_profit:0,expenses:0,net_profit:0,orders:0});
    return {period:d,branches:rows,totals,unallocated_expenses:Number(unallocated.rows[0].amount),unallocated_expense_count:unallocated.rows[0].count};
  }
}
