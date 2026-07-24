import { Injectable, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreatePODto } from './dto/create-po.dto';
import { ReceiveGoodsDto } from './dto/receive-goods.dto';

@Injectable()
export class PurchasingService implements OnModuleInit {
  constructor(private db:DatabaseService){}

  async onModuleInit(){
    await this.db.query(`ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(16,2) NOT NULL DEFAULT 0`);
    await this.db.query(`ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid'`);
    await this.db.query(`ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS due_date DATE`);
    await this.db.query(`ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS freight_amount NUMERIC(16,2) NOT NULL DEFAULT 0`);
    await this.db.query(`ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS customs_amount NUMERIC(16,2) NOT NULL DEFAULT 0`);
    await this.db.query(`ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS other_costs NUMERIC(16,2) NOT NULL DEFAULT 0`);
    await this.db.query(`CREATE TABLE IF NOT EXISTS purchase_payments(
      id UUID PRIMARY KEY,company_id UUID NOT NULL REFERENCES companies(id),po_id UUID NOT NULL REFERENCES purchase_orders(id),
      amount NUMERIC(16,2) NOT NULL CHECK(amount>0),method VARCHAR(30) NOT NULL,reference VARCHAR(160),notes TEXT,
      paid_by UUID REFERENCES users(id),paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await this.db.query(`CREATE TABLE IF NOT EXISTS purchase_returns(
      id UUID PRIMARY KEY,company_id UUID NOT NULL REFERENCES companies(id),po_id UUID NOT NULL REFERENCES purchase_orders(id),
      warehouse_id UUID NOT NULL REFERENCES warehouses(id),return_number VARCHAR(60) NOT NULL UNIQUE,status VARCHAR(20) NOT NULL DEFAULT 'posted',
      reason TEXT,credit_note VARCHAR(100),total_cost NUMERIC(16,2) NOT NULL DEFAULT 0,created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
    await this.db.query(`CREATE TABLE IF NOT EXISTS purchase_return_lines(
      id UUID PRIMARY KEY,return_id UUID NOT NULL REFERENCES purchase_returns(id) ON DELETE CASCADE,
      variant_id UUID NOT NULL REFERENCES product_variants(id),quantity INTEGER NOT NULL CHECK(quantity>0),unit_cost NUMERIC(16,2) NOT NULL DEFAULT 0)`);
  }

  async createSupplier(companyId:string,dto:CreateSupplierDto){
    const code=String(dto.code||`SUP-${Date.now().toString().slice(-6)}`).toUpperCase();
    const r=await this.db.query(`INSERT INTO suppliers(company_id,name,code,contact_person,phone,email,address,city,tax_number,payment_terms,notes)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [companyId,dto.name,code,dto.contact_person||null,dto.phone||null,dto.email||null,dto.address||null,dto.city||null,dto.tax_number||null,dto.payment_terms??30,dto.notes||null]);
    return r.rows[0];
  }
  async getSuppliers(companyId:string){
    return (await this.db.query(`SELECT s.*,COUNT(DISTINCT po.id)::int order_count,
      COALESCE(SUM(CASE WHEN po.status<>'cancelled' THEN po.total ELSE 0 END),0)::numeric lifetime_purchases,
      COALESCE(SUM(CASE WHEN po.payment_status<>'paid' AND po.status<>'cancelled' THEN po.total-po.paid_amount ELSE 0 END),0)::numeric outstanding
      FROM suppliers s LEFT JOIN purchase_orders po ON po.supplier_id=s.id WHERE s.company_id=$1 AND s.is_active=true
      GROUP BY s.id ORDER BY s.name`,[companyId])).rows;
  }
  async getSupplier(companyId:string,id:string){
    const r=await this.db.query(`SELECT * FROM suppliers WHERE id=$1 AND company_id=$2`,[id,companyId]);
    if(!r.rows[0])throw new NotFoundException('Supplier not found');return r.rows[0];
  }
  async updateSupplier(companyId:string,id:string,dto:Partial<CreateSupplierDto>){
    const allowed=['name','code','contact_person','phone','email','address','city','tax_number','payment_terms','notes'];
    const entries=Object.entries(dto).filter(([k,v])=>allowed.includes(k)&&v!==undefined);
    if(!entries.length)throw new BadRequestException('No valid fields to update');
    const values=entries.map(([,v])=>v);
    const set=entries.map(([k],i)=>`${k}=$${i+3}`).join(',');
    const r=await this.db.query(`UPDATE suppliers SET ${set},updated_at=NOW() WHERE id=$1 AND company_id=$2 RETURNING *`,[id,companyId,...values]);
    if(!r.rows[0])throw new NotFoundException('Supplier not found');return r.rows[0];
  }
  async deleteSupplier(companyId:string,id:string){
    const r=await this.db.query(`UPDATE suppliers SET is_active=false,updated_at=NOW() WHERE id=$1 AND company_id=$2 RETURNING id`,[id,companyId]);
    if(!r.rows[0])throw new NotFoundException('Supplier not found');return {success:true};
  }

  async createPO(companyId:string,userId:string,dto:CreatePODto&any){
    if(!dto.lines?.length)throw new BadRequestException('Add at least one variant');
    return this.db.transaction(async c=>{
      const valid=await c.query(`SELECT
        EXISTS(SELECT 1 FROM suppliers WHERE id=$1 AND company_id=$3 AND is_active=true) supplier_ok,
        EXISTS(SELECT 1 FROM warehouses WHERE id=$2 AND company_id=$3 AND is_active=true) warehouse_ok`,[dto.supplier_id,dto.warehouse_id,companyId]);
      if(!valid.rows[0]?.supplier_ok)throw new BadRequestException('Invalid supplier');
      if(!valid.rows[0]?.warehouse_ok)throw new BadRequestException('Invalid destination warehouse');
      const ids=dto.lines.map((x:any)=>x.variant_id);
      const variants=await c.query(`SELECT pv.id FROM product_variants pv JOIN products p ON p.id=pv.product_id WHERE p.company_id=$1 AND pv.id=ANY($2::uuid[])`,[companyId,ids]);
      if(variants.rows.length!==new Set(ids).size)throw new BadRequestException('One or more product variants are invalid');
      let subtotal=0,tax=0;
      const lines=dto.lines.map((x:any)=>{const qty=Number(x.quantity_ordered),cost=Number(x.unit_cost),rate=Number(x.tax_rate??15);if(qty<1||cost<0)throw new BadRequestException('Invalid quantity or unit cost');const base=qty*cost,t=base*rate/100;subtotal+=base;tax+=t;return {...x,quantity_ordered:qty,unit_cost:cost,tax_rate:rate,tax_amount:t,line_total:base+t}});
      const landed=Number(dto.freight_amount||0)+Number(dto.customs_amount||0)+Number(dto.other_costs||0);
      const supplier=await c.query(`SELECT payment_terms FROM suppliers WHERE id=$1`,[dto.supplier_id]);
      const terms=Number(supplier.rows[0]?.payment_terms||0);
      const po=await c.query(`INSERT INTO purchase_orders(company_id,po_number,supplier_id,warehouse_id,created_by,expected_date,subtotal,tax_amount,total,notes,due_date,freight_amount,customs_amount,other_costs)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_DATE+$11,$12,$13,$14) RETURNING *`,
        [companyId,`PO-${Date.now()}`,dto.supplier_id,dto.warehouse_id,userId,dto.expected_date||null,subtotal,tax,subtotal+tax+landed,dto.notes||null,terms,Number(dto.freight_amount||0),Number(dto.customs_amount||0),Number(dto.other_costs||0)]);
      for(const l of lines)await c.query(`INSERT INTO purchase_order_lines(po_id,variant_id,quantity_ordered,unit_cost,tax_rate,tax_amount,line_total) VALUES($1,$2,$3,$4,$5,$6,$7)`,[po.rows[0].id,l.variant_id,l.quantity_ordered,l.unit_cost,l.tax_rate,l.tax_amount,l.line_total]);
      return {...po.rows[0],lines};
    });
  }
  async getPOs(companyId:string,status?:string){
    const params:any[]=[companyId];let statusSql='';if(status){params.push(status);statusSql='AND po.status=$2'}
    return (await this.db.query(`SELECT po.*,s.name supplier_name,w.name warehouse_name,u.name created_by_name,
      COUNT(l.id)::int items_count,COALESCE(SUM(l.quantity_ordered),0)::int ordered_units,COALESCE(SUM(l.quantity_received),0)::int received_units
      FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id JOIN warehouses w ON w.id=po.warehouse_id
      JOIN users u ON u.id=po.created_by LEFT JOIN purchase_order_lines l ON l.po_id=po.id
      WHERE po.company_id=$1 ${statusSql} GROUP BY po.id,s.name,w.name,u.name ORDER BY po.created_at DESC LIMIT 300`,params)).rows;
  }
  async getPO(companyId:string,id:string){
    const po=await this.db.query(`SELECT po.*,s.name supplier_name,s.tax_number supplier_tax_number,s.payment_terms,w.name warehouse_name
      FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id JOIN warehouses w ON w.id=po.warehouse_id WHERE po.id=$1 AND po.company_id=$2`,[id,companyId]);
    if(!po.rows[0])throw new NotFoundException('Purchase order not found');
    const lines=await this.db.query(`SELECT l.*,pv.sku,pv.barcode,pv.size,pv.color,p.name product_name
      FROM purchase_order_lines l JOIN product_variants pv ON pv.id=l.variant_id JOIN products p ON p.id=pv.product_id WHERE l.po_id=$1 ORDER BY p.name,pv.sku`,[id]);
    const receipts=await this.db.query(`SELECT * FROM goods_receipts WHERE po_id=$1 ORDER BY received_at DESC`,[id]);
    const payments=await this.db.query(`SELECT * FROM purchase_payments WHERE po_id=$1 ORDER BY paid_at DESC`,[id]);
    const returns=await this.db.query(`SELECT * FROM purchase_returns WHERE po_id=$1 ORDER BY created_at DESC`,[id]);
    return {...po.rows[0],lines:lines.rows,receipts:receipts.rows,payments:payments.rows,returns:returns.rows};
  }
  async approvePO(companyId:string,userId:string,id:string){
    const r=await this.db.query(`UPDATE purchase_orders SET status='approved',approved_by=$1,approved_at=NOW(),updated_at=NOW() WHERE id=$2 AND company_id=$3 AND status='draft' RETURNING *`,[userId,id,companyId]);
    if(!r.rows[0])throw new BadRequestException('Only a draft PO can be approved');return r.rows[0];
  }
  async cancelPO(companyId:string,id:string){
    const r=await this.db.query(`UPDATE purchase_orders SET status='cancelled',updated_at=NOW() WHERE id=$1 AND company_id=$2 AND status IN('draft','approved') RETURNING *`,[id,companyId]);
    if(!r.rows[0])throw new BadRequestException('This PO cannot be cancelled');return r.rows[0];
  }

  async receiveGoods(companyId:string,userId:string,dto:ReceiveGoodsDto){
    return this.db.transaction(async c=>{
      const po=await c.query(`SELECT * FROM purchase_orders WHERE id=$1 AND company_id=$2 AND status IN('approved','partially_received') FOR UPDATE`,[dto.po_id,companyId]);
      if(!po.rows[0])throw new BadRequestException('PO is not ready for receiving');
      if(dto.supplier_invoice){const dup=await c.query(`SELECT id FROM goods_receipts WHERE company_id=$1 AND supplier_invoice=$2`,[companyId,dto.supplier_invoice]);if(dup.rows[0])throw new BadRequestException('Supplier invoice number already used');}
      const ordered=await c.query(`SELECT * FROM purchase_order_lines WHERE po_id=$1 FOR UPDATE`,[dto.po_id]);
      const grn=await c.query(`INSERT INTO goods_receipts(company_id,grn_number,po_id,warehouse_id,received_by,supplier_invoice,notes) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[companyId,`GRN-${Date.now()}`,dto.po_id,po.rows[0].warehouse_id,userId,dto.supplier_invoice||null,dto.notes||null]);
      let receivedAny=false;
      for(const line of dto.lines){
        const source=ordered.rows.find((x:any)=>x.id===line.po_line_id&&x.variant_id===line.variant_id);
        const qty=Number(line.quantity_received);if(!source||qty<1||qty>Number(source.quantity_ordered)-Number(source.quantity_received))throw new BadRequestException('Received quantity exceeds outstanding PO quantity');
        receivedAny=true;
        await c.query(`INSERT INTO goods_receipt_lines(grn_id,po_line_id,variant_id,quantity_received,unit_cost) VALUES($1,$2,$3,$4,$5)`,[grn.rows[0].id,line.po_line_id,line.variant_id,qty,source.unit_cost]);
        await c.query(`UPDATE purchase_order_lines SET quantity_received=quantity_received+$1 WHERE id=$2`,[qty,line.po_line_id]);
        const before=await c.query(`SELECT quantity FROM inventory WHERE warehouse_id=$1 AND variant_id=$2`,[po.rows[0].warehouse_id,line.variant_id]);const old=Number(before.rows[0]?.quantity||0);
        await c.query(`INSERT INTO inventory(warehouse_id,variant_id,quantity) VALUES($1,$2,$3) ON CONFLICT(warehouse_id,variant_id) DO UPDATE SET quantity=inventory.quantity+EXCLUDED.quantity,updated_at=NOW()`,[po.rows[0].warehouse_id,line.variant_id,qty]);
        await c.query(`INSERT INTO stock_movements(warehouse_id,variant_id,movement_type,quantity,quantity_before,quantity_after,reason,created_by) VALUES($1,$2,'purchase',$3,$4,$5,$6,$7)`,[po.rows[0].warehouse_id,line.variant_id,qty,old,old+qty,grn.rows[0].grn_number,userId]);
      }
      if(!receivedAny)throw new BadRequestException('Enter at least one received quantity');
      const pending=await c.query(`SELECT COUNT(*)::int count FROM purchase_order_lines WHERE po_id=$1 AND quantity_received<quantity_ordered`,[dto.po_id]);
      const status=Number(pending.rows[0].count)?'partially_received':'received';
      await c.query(`UPDATE purchase_orders SET status=$1,updated_at=NOW() WHERE id=$2`,[status,dto.po_id]);
      return {...grn.rows[0],status};
    });
  }
  async getGRNs(companyId:string){return (await this.db.query(`SELECT g.*,po.po_number,s.name supplier_name,u.name received_by_name FROM goods_receipts g JOIN purchase_orders po ON po.id=g.po_id JOIN suppliers s ON s.id=po.supplier_id JOIN users u ON u.id=g.received_by WHERE g.company_id=$1 ORDER BY g.received_at DESC LIMIT 200`,[companyId])).rows}

  async recordPayment(companyId:string,userId:string,id:string,body:any){
    return this.db.transaction(async c=>{
      const po=await c.query(`SELECT * FROM purchase_orders WHERE id=$1 AND company_id=$2 AND status<>'cancelled' FOR UPDATE`,[id,companyId]);if(!po.rows[0])throw new NotFoundException('PO not found');
      const amount=Number(body.amount),outstanding=Number(po.rows[0].total)-Number(po.rows[0].paid_amount);if(amount<=0||amount>outstanding)throw new BadRequestException('Payment exceeds outstanding amount');
      await c.query(`INSERT INTO purchase_payments(id,company_id,po_id,amount,method,reference,notes,paid_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[randomUUID(),companyId,id,amount,body.method||'bank',body.reference||null,body.notes||null,userId]);
      const paid=Number(po.rows[0].paid_amount)+amount,status=paid>=Number(po.rows[0].total)?'paid':'partial';
      return (await c.query(`UPDATE purchase_orders SET paid_amount=$1,payment_status=$2,updated_at=NOW() WHERE id=$3 RETURNING *`,[paid,status,id])).rows[0];
    });
  }
  async createReturn(companyId:string,userId:string,id:string,body:any){
    return this.db.transaction(async c=>{
      const po=await c.query(`SELECT * FROM purchase_orders WHERE id=$1 AND company_id=$2 AND status IN('received','partially_received') FOR UPDATE`,[id,companyId]);if(!po.rows[0])throw new BadRequestException('Only received goods can be returned');
      const lines=body.lines?.filter((x:any)=>Number(x.quantity)>0)||[];if(!lines.length)throw new BadRequestException('Add return quantities');
      const ordered=await c.query(`SELECT l.*,COALESCE((SELECT SUM(prl.quantity) FROM purchase_return_lines prl JOIN purchase_returns pr ON pr.id=prl.return_id WHERE pr.po_id=$1 AND prl.variant_id=l.variant_id),0)::int already_returned FROM purchase_order_lines l WHERE l.po_id=$1`,[id]);let total=0;
      const ret=await c.query(`INSERT INTO purchase_returns(id,company_id,po_id,warehouse_id,return_number,reason,credit_note,total_cost,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,0,$8) RETURNING *`,[randomUUID(),companyId,id,po.rows[0].warehouse_id,`PR-${Date.now()}`,body.reason||null,body.credit_note||null,userId]);
      for(const l of lines){const src=ordered.rows.find((x:any)=>x.variant_id===l.variant_id);const qty=Number(l.quantity);if(!src||qty>Number(src.quantity_received)-Number(src.already_returned))throw new BadRequestException('Return exceeds remaining received quantity');const stock=await c.query(`SELECT quantity FROM inventory WHERE warehouse_id=$1 AND variant_id=$2 FOR UPDATE`,[po.rows[0].warehouse_id,l.variant_id]);const before=Number(stock.rows[0]?.quantity||0);if(before<qty)throw new BadRequestException('Insufficient warehouse stock for return');total+=qty*Number(src.unit_cost);await c.query(`INSERT INTO purchase_return_lines(id,return_id,variant_id,quantity,unit_cost) VALUES($1,$2,$3,$4,$5)`,[randomUUID(),ret.rows[0].id,l.variant_id,qty,src.unit_cost]);await c.query(`UPDATE inventory SET quantity=quantity-$1,updated_at=NOW() WHERE warehouse_id=$2 AND variant_id=$3`,[qty,po.rows[0].warehouse_id,l.variant_id]);await c.query(`INSERT INTO stock_movements(warehouse_id,variant_id,movement_type,quantity,quantity_before,quantity_after,reason,created_by) VALUES($1,$2,'purchase_return',$3,$4,$5,$6,$7)`,[po.rows[0].warehouse_id,l.variant_id,-qty,before,before-qty,ret.rows[0].return_number,userId]);}
      return (await c.query(`UPDATE purchase_returns SET total_cost=$1 WHERE id=$2 RETURNING *`,[total,ret.rows[0].id])).rows[0];
    });
  }
}
