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
}
