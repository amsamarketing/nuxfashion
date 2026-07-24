import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { TransferStockDto } from './dto/transfer-stock.dto';

@Injectable()
export class InventoryService {
  constructor(private db: DatabaseService) {}

  async getStock(companyId: string, warehouseId?: string, variantId?: string) {
    const conditions = ['p.company_id = $1'];
    const params: any[] = [companyId];
    let idx = 2;
    if (warehouseId) { conditions.push(`i.warehouse_id = $${idx++}`); params.push(warehouseId); }
    if (variantId)   { conditions.push(`i.variant_id = $${idx++}`);   params.push(variantId); }
    const result = await this.db.query(
      `SELECT i.id, i.warehouse_id, w.name as warehouse_name,
              i.variant_id, pv.sku, p.name as product_name,
              i.quantity, i.reserved_quantity,
              (i.quantity - i.reserved_quantity) as available_quantity,
              i.reorder_point, i.reorder_quantity, i.updated_at
       FROM inventory i
       JOIN warehouses w ON w.id = i.warehouse_id
       JOIN product_variants pv ON pv.id = i.variant_id
       JOIN products p ON p.id = pv.product_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.name, pv.sku`,
      params,
    );
    return result.rows;
  }

  async getSummary(companyId: string) {
    const result = await this.db.query(
      `SELECT
         COUNT(DISTINCT i.variant_id) as total_variants,
         COUNT(DISTINCT i.warehouse_id) as total_warehouses,
         SUM(i.quantity) as total_units,
         SUM(i.reserved_quantity) as total_reserved,
         SUM(i.quantity - i.reserved_quantity) as total_available,
         COUNT(DISTINCT CASE WHEN i.quantity <= i.reorder_point THEN i.variant_id END) as low_stock_count
       FROM inventory i
       JOIN product_variants pv ON pv.id = i.variant_id
       JOIN products p ON p.id = pv.product_id
       WHERE p.company_id = $1`,
      [companyId],
    );
    return result.rows[0];
  }

  async adjustStock(companyId: string, userId: string, dto: AdjustStockDto) {
    const current = await this.db.query(
      `SELECT i.id, i.quantity FROM inventory i
       JOIN product_variants pv ON pv.id = i.variant_id
       JOIN products p ON p.id = pv.product_id
       WHERE i.warehouse_id = $1 AND i.variant_id = $2 AND p.company_id = $3`,
      [dto.warehouse_id, dto.variant_id, companyId],
    );
    const before = current.rows[0]?.quantity ?? 0;
    const after = before + dto.quantity;
    if (current.rows[0]) {
      await this.db.query(
        `UPDATE inventory SET quantity = $1, updated_at = NOW()
         WHERE warehouse_id = $2 AND variant_id = $3`,
        [after, dto.warehouse_id, dto.variant_id],
      );
    } else {
      await this.db.query(
        `INSERT INTO inventory (warehouse_id, variant_id, quantity) VALUES ($1,$2,$3)`,
        [dto.warehouse_id, dto.variant_id, Math.max(0, after)],
      );
    }
    await this.db.query(
      `INSERT INTO stock_movements
         (warehouse_id, variant_id, movement_type, quantity, quantity_before, quantity_after, reason, notes, created_by)
       VALUES ($1,$2,'adjustment',$3,$4,$5,$6,$7,$8)`,
      [dto.warehouse_id, dto.variant_id, dto.quantity, before, after, dto.reason, dto.notes ?? null, userId],
    );
    return { success: true, quantity_before: before, quantity_after: after };
  }

  async transferStock(companyId: string, userId: string, dto: TransferStockDto) {
    const fromRow = await this.db.query(
      `SELECT i.quantity FROM inventory i
       JOIN product_variants pv ON pv.id = i.variant_id
       JOIN products p ON p.id = pv.product_id
       WHERE i.warehouse_id = $1 AND i.variant_id = $2 AND p.company_id = $3`,
      [dto.from_warehouse_id, dto.variant_id, companyId],
    );
    const fromBefore = fromRow.rows[0]?.quantity ?? 0;
    if (fromBefore < dto.quantity) throw new Error('Insufficient stock');
    const toRow = await this.db.query(
      `SELECT quantity FROM inventory WHERE warehouse_id = $1 AND variant_id = $2`,
      [dto.to_warehouse_id, dto.variant_id],
    );
    const toBefore = toRow.rows[0]?.quantity ?? 0;
    await this.db.query(
      `UPDATE inventory SET quantity = quantity - $1, updated_at = NOW()
       WHERE warehouse_id = $2 AND variant_id = $3`,
      [dto.quantity, dto.from_warehouse_id, dto.variant_id],
    );
    if (toRow.rows[0]) {
      await this.db.query(
        `UPDATE inventory SET quantity = quantity + $1, updated_at = NOW()
         WHERE warehouse_id = $2 AND variant_id = $3`,
        [dto.quantity, dto.to_warehouse_id, dto.variant_id],
      );
    } else {
      await this.db.query(
        `INSERT INTO inventory (warehouse_id, variant_id, quantity) VALUES ($1,$2,$3)`,
        [dto.to_warehouse_id, dto.variant_id, dto.quantity],
      );
    }
    await this.db.query(
      `INSERT INTO stock_movements
         (warehouse_id, variant_id, movement_type, quantity, quantity_before, quantity_after, notes, created_by)
       VALUES ($1,$2,'transfer_out',$3,$4,$5,$6,$7),
              ($8,$2,'transfer_in',$3,$9,$10,$6,$7)`,
      [dto.from_warehouse_id, dto.variant_id, dto.quantity,
       fromBefore, fromBefore - dto.quantity, dto.notes ?? null, userId,
       dto.to_warehouse_id, toBefore, toBefore + dto.quantity],
    );
    return { success: true, transferred: dto.quantity };
  }

  async getMovements(companyId: string, warehouseId?: string, variantId?: string) {
    const conditions = ['p.company_id = $1'];
    const params: any[] = [companyId];
    let idx = 2;
    if (warehouseId) { conditions.push(`sm.warehouse_id = $${idx++}`); params.push(warehouseId); }
    if (variantId)   { conditions.push(`sm.variant_id = $${idx++}`);   params.push(variantId); }
    const result = await this.db.query(
      `SELECT sm.id, sm.movement_type, sm.quantity, sm.quantity_before, sm.quantity_after,
              sm.reason, sm.notes, sm.created_at,
              w.name as warehouse_name, pv.sku, p.name as product_name
       FROM stock_movements sm
       JOIN warehouses w ON w.id = sm.warehouse_id
       JOIN product_variants pv ON pv.id = sm.variant_id
       JOIN products p ON p.id = pv.product_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY sm.created_at DESC
       LIMIT 200`,
      params,
    );
    return result.rows;
  }

  async getLowStock(companyId: string) {
    const result = await this.db.query(
      `SELECT i.warehouse_id, w.name as warehouse_name,
              i.variant_id, pv.sku, p.name as product_name,
              i.quantity, i.reorder_point, i.reorder_quantity
       FROM inventory i
       JOIN warehouses w ON w.id = i.warehouse_id
       JOIN product_variants pv ON pv.id = i.variant_id
       JOIN products p ON p.id = pv.product_id
       WHERE p.company_id = $1 AND i.quantity <= i.reorder_point
       ORDER BY i.quantity ASC`,
      [companyId],
    );
    return result.rows;
  }

  async getWarehouses(companyId: string) {
    try {
      const result = await this.db.query(
        `SELECT w.id, w.name,
           COALESCE(w.location, '') as location,
           COUNT(DISTINCT i.variant_id) as sku_count,
           COALESCE(SUM(i.quantity), 0) as total_units
         FROM warehouses w
         LEFT JOIN inventory i ON i.warehouse_id = w.id
         WHERE w.company_id = $1
         GROUP BY w.id, w.name, w.location
         ORDER BY w.name`,
        [companyId],
      );
      if (result.rows.length > 0) return result.rows;
    } catch {}
    const fallback = await this.db.query(
      `SELECT DISTINCT w.id, w.name, '' as location, 0 as sku_count, 0 as total_units
       FROM warehouses w
       JOIN inventory i ON i.warehouse_id = w.id
       JOIN product_variants pv ON pv.id = i.variant_id
       JOIN products p ON p.id = pv.product_id
       WHERE p.company_id = $1`,
      [companyId],
    );
    return fallback.rows;
  }

  async createWarehouse(companyId: string, dto: { name: string; location?: string; address?: string; city?: string; code?: string }) {
    // Get actual columns from DB first
    const cols = await this.db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name='warehouses'`
    );
    const colNames = cols.rows.map((r: any) => r.column_name);
    const fields: string[] = ['company_id', 'name'];
    const vals: any[] = [companyId, dto.name];
    if (dto.location && colNames.includes('location')) { fields.push('location'); vals.push(dto.location); }
    if (dto.address && colNames.includes('address')) { fields.push('address'); vals.push(dto.address); }
    if (dto.city && colNames.includes('city')) { fields.push('city'); vals.push(dto.city); }
    if (dto.code && colNames.includes('code')) { fields.push('code'); vals.push(dto.code); }
    const placeholders = vals.map((_,i) => `$${i+1}`).join(',');
    const result = await this.db.query(
      `INSERT INTO warehouses (${fields.join(',')}) VALUES (${placeholders}) RETURNING *`,
      vals,
    );
    return result.rows[0];
  }

  async getWarehouseStock(companyId: string, warehouseId: string) {
    const result = await this.db.query(
      `SELECT i.id, i.variant_id, i.quantity, i.reorder_point,
              pv.sku, pv.name as variant_name,
              p.id as product_id, p.name as product_name
       FROM inventory i
       JOIN product_variants pv ON pv.id = i.variant_id
       JOIN products p ON p.id = pv.product_id
       WHERE i.warehouse_id = $1 AND p.company_id = $2
       ORDER BY p.name, pv.sku`,
      [warehouseId, companyId],
    );
    return result.rows;
  }

  async getVariants(companyId: string) {
    const result = await this.db.query(
      `SELECT pv.id, pv.sku, p.name as product_name, pv.color, pv.size
       FROM product_variants pv
       JOIN products p ON p.id = pv.product_id
       WHERE p.company_id = $1 AND p.is_active = true
       ORDER BY p.name, pv.sku`,
      [companyId],
    );
    return result.rows;
  }

  async getTransfers(companyId:string){
    const result=await this.db.query(
      `SELECT t.*,fb.name from_branch_name,fb.code from_branch_code,tb.name to_branch_name,tb.code to_branch_code,
       ru.name requested_by_name,au.name approved_by_name,
       COALESCE((SELECT SUM(s.amount) FROM interbranch_settlements s WHERE s.transfer_id=t.id),0) settled_amount,
       COALESCE((SELECT json_agg(jsonb_build_object('id',l.id,'variant_id',l.variant_id,'quantity',l.quantity,
         'received_quantity',l.received_quantity,'unit_cost',l.unit_cost,'sku',pv.sku,'product_name',p.name,'size',pv.size,'color',pv.color))
         FROM branch_stock_transfer_lines l JOIN product_variants pv ON pv.id=l.variant_id JOIN products p ON p.id=pv.product_id
         WHERE l.transfer_id=t.id),'[]') lines
       FROM branch_stock_transfers t JOIN branches fb ON fb.id=t.from_branch_id JOIN branches tb ON tb.id=t.to_branch_id
       LEFT JOIN users ru ON ru.id=t.requested_by LEFT JOIN users au ON au.id=t.approved_by
       WHERE t.company_id=$1 ORDER BY t.requested_at DESC LIMIT 150`,[companyId]);
    return result.rows;
  }

  private async transfer(companyId:string,id:string,status?:string){
    const params:any[]=[id,companyId];let sql=`SELECT t.*,fb.warehouse_id from_warehouse_id,tb.warehouse_id to_warehouse_id FROM branch_stock_transfers t JOIN branches fb ON fb.id=t.from_branch_id JOIN branches tb ON tb.id=t.to_branch_id WHERE t.id=$1 AND t.company_id=$2`;
    if(status){params.push(status);sql+=` AND t.status=$3`}
    const row=await this.db.query(sql,params);if(!row.rows[0])throw new NotFoundException(status?`Transfer is not ${status}`:'Transfer not found');return row.rows[0];
  }

  async requestTransfer(companyId:string,userId:string,body:any){
    const from=String(body.from_branch_id||''),to=String(body.to_branch_id||''),lines=Array.isArray(body.lines)?body.lines:[];
    if(!from||!to||from===to||!lines.length)throw new BadRequestException('Select different source/destination branches and at least one product');
    const branchCheck=await this.db.query(`SELECT id,warehouse_id FROM branches WHERE company_id=$1 AND id=ANY($2::uuid[]) AND is_active=true`,[companyId,[from,to]]);
    if(branchCheck.rows.length!==2)throw new BadRequestException('Invalid or inactive branch');
    const source:any=branchCheck.rows.find((x:any)=>x.id===from),ids=lines.map((x:any)=>x.variant_id);
    if(!source)throw new BadRequestException('Source branch not found');
    const products=await this.db.query(
      `SELECT pv.id,pv.cost_price,COALESCE(i.quantity-i.reserved_quantity,0) available
       FROM product_variants pv JOIN products p ON p.id=pv.product_id
       LEFT JOIN inventory i ON i.variant_id=pv.id AND i.warehouse_id=$2
       WHERE p.company_id=$1 AND pv.id=ANY($3::uuid[])`,[companyId,source.warehouse_id,ids]);
    let value=0;for(const line of lines){const p:any=products.rows.find((x:any)=>x.id===line.variant_id),qty=Number(line.quantity||0);if(!p||qty<=0||Number(p.available)<qty)throw new BadRequestException(`Insufficient available stock for ${line.variant_id}`);value+=qty*Number(p.cost_price||0)}
    return this.db.transaction(async client=>{
      const id=randomUUID(),number=`BT-${Date.now()}`;
      await client.query(`INSERT INTO branch_stock_transfers(id,company_id,transfer_number,from_branch_id,to_branch_id,transfer_value,settlement_status,notes,requested_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[id,companyId,number,from,to,value,value>0?'unpaid':'waived',body.notes||null,userId]);
      for(const line of lines){const p:any=products.rows.find((x:any)=>x.id===line.variant_id);await client.query(`INSERT INTO branch_stock_transfer_lines(id,transfer_id,variant_id,quantity,unit_cost) VALUES($1,$2,$3,$4,$5)`,[randomUUID(),id,line.variant_id,Number(line.quantity),Number(p.cost_price||0)])}
      return {id,transfer_number:number,status:'requested',transfer_value:value};
    });
  }

  async approveTransfer(companyId:string,userId:string,id:string){
    const t=await this.transfer(companyId,id,'requested');return this.db.transaction(async client=>{
      const lines=await client.query(`SELECT * FROM branch_stock_transfer_lines WHERE transfer_id=$1`,[id]);
      for(const l of lines.rows){const stock=await client.query(`SELECT quantity,reserved_quantity FROM inventory WHERE warehouse_id=$1 AND variant_id=$2 FOR UPDATE`,[t.from_warehouse_id,l.variant_id]);if(!stock.rows[0]||Number(stock.rows[0].quantity)-Number(stock.rows[0].reserved_quantity)<Number(l.quantity))throw new BadRequestException('Stock is no longer available for approval');await client.query(`UPDATE inventory SET reserved_quantity=reserved_quantity+$1,updated_at=NOW() WHERE warehouse_id=$2 AND variant_id=$3`,[l.quantity,t.from_warehouse_id,l.variant_id])}
      const row=await client.query(`UPDATE branch_stock_transfers SET status='approved',approved_by=$1,approved_at=NOW() WHERE id=$2 RETURNING *`,[userId,id]);return row.rows[0];
    });
  }

  async dispatchTransfer(companyId:string,userId:string,id:string){
    const t=await this.transfer(companyId,id,'approved');return this.db.transaction(async client=>{
      const lines=await client.query(`SELECT * FROM branch_stock_transfer_lines WHERE transfer_id=$1`,[id]);
      for(const l of lines.rows){const stock=await client.query(`UPDATE inventory SET quantity=quantity-$1,reserved_quantity=GREATEST(0,reserved_quantity-$1),updated_at=NOW() WHERE warehouse_id=$2 AND variant_id=$3 RETURNING quantity`,[l.quantity,t.from_warehouse_id,l.variant_id]);await client.query(`INSERT INTO stock_movements(warehouse_id,variant_id,movement_type,quantity,quantity_before,quantity_after,reason,created_by) VALUES($1,$2,'transfer_out',$3,$4,$5,$6,$7)`,[t.from_warehouse_id,l.variant_id,-Number(l.quantity),Number(stock.rows[0].quantity)+Number(l.quantity),stock.rows[0].quantity,t.transfer_number,userId])}
      const row=await client.query(`UPDATE branch_stock_transfers SET status='in_transit',dispatched_by=$1,dispatched_at=NOW() WHERE id=$2 RETURNING *`,[userId,id]);return row.rows[0];
    });
  }

  async receiveTransfer(companyId:string,userId:string,id:string,body:any){
    const t=await this.transfer(companyId,id,'in_transit');return this.db.transaction(async client=>{
      const lines=await client.query(`SELECT * FROM branch_stock_transfer_lines WHERE transfer_id=$1`,[id]);
      for(const l of lines.rows){const requested=Number(l.quantity),given=body?.received?.find((x:any)=>x.line_id===l.id)?.quantity,qty=given===undefined?requested:Number(given);if(qty<0||qty>requested)throw new BadRequestException('Invalid received quantity');const before=await client.query(`SELECT quantity FROM inventory WHERE warehouse_id=$1 AND variant_id=$2`,[t.to_warehouse_id,l.variant_id]);const b=Number(before.rows[0]?.quantity||0);await client.query(`INSERT INTO inventory(warehouse_id,variant_id,quantity) VALUES($1,$2,$3) ON CONFLICT(warehouse_id,variant_id) DO UPDATE SET quantity=inventory.quantity+EXCLUDED.quantity,updated_at=NOW()`,[t.to_warehouse_id,l.variant_id,qty]);await client.query(`UPDATE branch_stock_transfer_lines SET received_quantity=$1 WHERE id=$2`,[qty,l.id]);if(qty)await client.query(`INSERT INTO stock_movements(warehouse_id,variant_id,movement_type,quantity,quantity_before,quantity_after,reason,created_by) VALUES($1,$2,'transfer_in',$3,$4,$5,$6,$7)`,[t.to_warehouse_id,l.variant_id,qty,b,b+qty,t.transfer_number,userId])}
      const row=await client.query(`UPDATE branch_stock_transfers SET status='received',received_by=$1,received_at=NOW() WHERE id=$2 RETURNING *`,[userId,id]);return row.rows[0];
    });
  }

  async cancelTransfer(companyId:string,id:string){
    const t=await this.transfer(companyId,id);if(!['requested','approved'].includes(t.status))throw new BadRequestException('Only requested or approved transfers can be cancelled');
    return this.db.transaction(async client=>{if(t.status==='approved'){const lines=await client.query(`SELECT * FROM branch_stock_transfer_lines WHERE transfer_id=$1`,[id]);for(const l of lines.rows)await client.query(`UPDATE inventory SET reserved_quantity=GREATEST(0,reserved_quantity-$1) WHERE warehouse_id=$2 AND variant_id=$3`,[l.quantity,t.from_warehouse_id,l.variant_id])}const row=await client.query(`UPDATE branch_stock_transfers SET status='cancelled',cancelled_at=NOW() WHERE id=$1 RETURNING *`,[id]);return row.rows[0]});
  }

  async settleTransfer(companyId:string,userId:string,id:string,body:any){
    const t=await this.transfer(companyId,id);if(!['in_transit','received'].includes(t.status))throw new BadRequestException('Approve and dispatch transfer before settlement');
    const paid=await this.db.query(`SELECT COALESCE(SUM(amount),0) total FROM interbranch_settlements WHERE transfer_id=$1`,[id]),amount=Number(body.amount||0),remaining=Number(t.transfer_value)-Number(paid.rows[0].total);
    if(amount<=0||amount>remaining+.001)throw new BadRequestException(`Settlement must be between 0 and ${remaining.toFixed(2)}`);
    const payer=await this.db.query(
      `SELECT a.id,a.opening_balance+COALESCE(SUM(CASE WHEN x.direction='credit' THEN x.amount ELSE -x.amount END),0) balance
       FROM branch_payment_accounts a LEFT JOIN branch_account_transactions x ON x.account_id=a.id
       WHERE a.id=$1 AND a.branch_id=$2 AND a.is_active=true GROUP BY a.id`,[body.payer_account_id,t.to_branch_id]);
    const payee=await this.db.query(`SELECT id FROM branch_payment_accounts WHERE id=$1 AND branch_id=$2 AND is_active=true`,[body.payee_account_id,t.from_branch_id]);
    if(!payer.rows[0]||!payee.rows[0])throw new BadRequestException('Select valid destination payer and source receiving accounts');
    if(Number(payer.rows[0].balance)<amount)throw new BadRequestException(`Payer account balance is only ${Number(payer.rows[0].balance).toFixed(2)}`);
    return this.db.transaction(async client=>{const sid=randomUUID();await client.query(`INSERT INTO interbranch_settlements(id,transfer_id,payer_branch_id,payee_branch_id,payer_account_id,payee_account_id,amount,reference,notes,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[sid,id,t.to_branch_id,t.from_branch_id,body.payer_account_id,body.payee_account_id,amount,body.reference||null,body.notes||null,userId]);await client.query(`INSERT INTO branch_account_transactions(id,branch_id,account_id,direction,amount,reference_type,reference_id,note,created_by) VALUES($1,$2,$3,'debit',$4,'interbranch_settlement',$5,$6,$7),($8,$9,$10,'credit',$4,'interbranch_settlement',$5,$6,$7)`,[randomUUID(),t.to_branch_id,body.payer_account_id,amount,sid,`Settlement ${t.transfer_number}`,userId,randomUUID(),t.from_branch_id,body.payee_account_id]);const newPaid=Number(paid.rows[0].total)+amount,status=newPaid>=Number(t.transfer_value)-.001?'paid':'partial';await client.query(`UPDATE branch_stock_transfers SET settlement_status=$1 WHERE id=$2`,[status,id]);return {id:sid,amount,settlement_status:status,remaining:Math.max(0,Number(t.transfer_value)-newPaid)}});
  }

}
