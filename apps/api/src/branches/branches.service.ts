import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
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
    await this.db.query(`CREATE TABLE IF NOT EXISTS branch_user_assignments(
      branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY(branch_id,user_id)
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
    await this.db.query(`CREATE TABLE IF NOT EXISTS branch_account_transactions(
      id UUID PRIMARY KEY,branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      account_id UUID NOT NULL REFERENCES branch_payment_accounts(id) ON DELETE RESTRICT,
      direction VARCHAR(10) NOT NULL CHECK(direction IN('credit','debit')),
      amount NUMERIC(16,2) NOT NULL CHECK(amount>0),reference_type VARCHAR(50),
      reference_id UUID,note TEXT,created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
        `INSERT INTO branches(id,company_id,warehouse_id,code,name,invoice_prefix)
         VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(warehouse_id) DO NOTHING`,
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
       FROM users u JOIN user_roles ur ON ur.user_id=u.id
       WHERE ur.company_id=$1 AND u.deleted_at IS NULL ORDER BY u.name,u.email`,[companyId],
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
      await client.query(`INSERT INTO warehouses(id,company_id,name) VALUES($1,$2,$3)`,[warehouseId,companyId,name]);
      const id=randomUUID();
      const result=await client.query(
        `INSERT INTO branches(id,company_id,warehouse_id,code,name,invoice_prefix,city,address,phone,manager_name,is_active)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
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
      `UPDATE branches SET code=$1,name=$2,invoice_prefix=$3,city=$4,address=$5,phone=$6,
       manager_name=$7,is_active=$8,updated_at=NOW() WHERE id=$9 AND company_id=$10 RETURNING *`,
      [String(b.code).toUpperCase(),b.name,String(b.invoice_prefix).toUpperCase(),b.city||null,b.address||null,b.phone||null,b.manager_name||null,b.is_active!==false,id,companyId],
    );
    await this.db.query(`UPDATE warehouses SET name=$1 WHERE id=$2 AND company_id=$3`,[b.name,current.rows[0].warehouse_id,companyId]);
    return result.rows[0];
  }

  async assignUsers(companyId:string,id:string,userIds:string[]){
    const branch=await this.db.query(`SELECT id FROM branches WHERE id=$1 AND company_id=$2`,[id,companyId]);
    if(!branch.rows[0])throw new NotFoundException('Branch not found');
    const valid=await this.db.query(`SELECT DISTINCT user_id FROM user_roles WHERE company_id=$1 AND user_id=ANY($2::uuid[])`,[companyId,userIds]);
    return this.db.transaction(async client=>{
      await client.query(`DELETE FROM branch_user_assignments WHERE branch_id=$1`,[id]);
      for(const row of valid.rows)await client.query(
        `INSERT INTO branch_user_assignments(branch_id,user_id) VALUES($1,$2)`,[id,row.user_id],
      );
      return {success:true,assigned:valid.rows.length};
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
       SELECT $1,$2,$3,$4,true WHERE NOT EXISTS(
         SELECT 1 FROM branch_payment_accounts WHERE branch_id=$2 AND method=$4 AND is_active=true)`,
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
         is_default=$6,is_active=$7,updated_at=NOW() WHERE id=$8 AND branch_id=$9 RETURNING *`,
        [body.name,method,body.provider||null,body.account_reference||null,Number(body.opening_balance||0),body.is_default===true,body.is_active!==false,accountId,branchId]);
      if(!result.rows[0])throw new NotFoundException('Account not found');return result.rows[0];
    }
    const result=await this.db.query(
      `INSERT INTO branch_payment_accounts(id,branch_id,name,method,provider,account_reference,opening_balance,is_default,is_active)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [randomUUID(),branchId,body.name,method,body.provider||null,body.account_reference||null,Number(body.opening_balance||0),body.is_default===true,body.is_active!==false]);
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
}
