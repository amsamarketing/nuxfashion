import { Injectable, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { randomUUID } from 'crypto';

@Injectable()
export class FinanceService implements OnModuleInit {
  constructor(private db: DatabaseService) {}

  async onModuleInit() {
    await this.db.query(`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS allocation_method VARCHAR(20) NOT NULL DEFAULT 'head_office'`);
    await this.db.query(`CREATE TABLE IF NOT EXISTS expense_allocations(
      id UUID PRIMARY KEY,expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
      allocation_percent NUMERIC(9,6) NOT NULL,amount NUMERIC(16,2) NOT NULL,
      tax_amount NUMERIC(16,2) NOT NULL,total NUMERIC(16,2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),UNIQUE(expense_id,branch_id)
    )`);
    await this.db.query(
      `INSERT INTO expense_allocations(id,expense_id,branch_id,allocation_percent,amount,tax_amount,total)
       SELECT gen_random_uuid(),e.id,e.branch_id,100,e.amount,e.tax_amount,e.total FROM expenses e
       WHERE e.branch_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM expense_allocations a WHERE a.expense_id=e.id)`,
    );
  }

  // ── Chart of Accounts ──────────────────────────────────────────────────────

  async createAccount(companyId: string, dto: CreateAccountDto) {
    const result = await this.db.query(
      `INSERT INTO accounts (company_id,code,name,type,category,parent_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [companyId, dto.code, dto.name, dto.type, dto.category ?? null, dto.parent_id ?? null],
    );
    return result.rows[0];
  }

  async getAccounts(companyId: string, type?: string) {
    const conditions = ['a.company_id=$1', 'a.is_active=true'];
    const params: any[] = [companyId];
    if (type) { conditions.push('a.type=$2'); params.push(type); }
    const result = await this.db.query(
      `SELECT a.*, p.name as parent_name
       FROM accounts a
       LEFT JOIN accounts p ON p.id=a.parent_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.code`,
      params,
    );
    return result.rows;
  }

  // ── Journal Entries ────────────────────────────────────────────────────────

  async createJournalEntry(companyId: string, userId: string, dto: CreateJournalEntryDto) {
    const totalDebit  = dto.lines.reduce((s, l) => s + l.debit,  0);
    const totalCredit = dto.lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01)
      throw new BadRequestException(`Journal entry not balanced: debits ${totalDebit} ≠ credits ${totalCredit}`);

    const entryNumber = `JE-${Date.now()}`;
    const entry = await this.db.query(
      `INSERT INTO journal_entries (company_id,entry_number,date,description,reference_type,reference_id,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [companyId, entryNumber, dto.date, dto.description,
       dto.reference_type ?? null, dto.reference_id ?? null, userId],
    );
    const entryId = entry.rows[0].id;

    for (const line of dto.lines) {
      await this.db.query(
        `INSERT INTO journal_lines (entry_id,account_id,description,debit,credit)
         VALUES ($1,$2,$3,$4,$5)`,
        [entryId, line.account_id, line.description ?? null, line.debit, line.credit],
      );
      // Update account balance: debit increases asset/expense, credit increases liability/equity/revenue
      await this.db.query(
        `UPDATE accounts SET balance = balance + $1
         WHERE id=$2`,
        [line.debit - line.credit, line.account_id],
      );
    }
    return { ...entry.rows[0], lines: dto.lines };
  }

  async getJournalEntries(companyId: string, from?: string, to?: string) {
    const conditions = ['je.company_id=$1'];
    const params: any[] = [companyId];
    let idx = 2;
    if (from) { conditions.push(`je.date>=$${idx++}`); params.push(from); }
    if (to)   { conditions.push(`je.date<=$${idx++}`); params.push(to); }
    const result = await this.db.query(
      `SELECT je.*, u.name as created_by_name,
         SUM(jl.debit) as total_debit, SUM(jl.credit) as total_credit
       FROM journal_entries je
       JOIN users u ON u.id=je.created_by
       LEFT JOIN journal_lines jl ON jl.entry_id=je.id
       WHERE ${conditions.join(' AND ')}
       GROUP BY je.id, u.name
       ORDER BY je.date DESC, je.created_at DESC LIMIT 200`,
      params,
    );
    return result.rows;
  }

  async getJournalEntry(companyId: string, id: string) {
    const entry = await this.db.query(
      `SELECT je.*, u.name as created_by_name
       FROM journal_entries je
       JOIN users u ON u.id=je.created_by
       WHERE je.id=$1 AND je.company_id=$2`,
      [id, companyId],
    );
    if (!entry.rows[0]) throw new NotFoundException('Journal entry not found');
    const lines = await this.db.query(
      `SELECT jl.*, a.code as account_code, a.name as account_name
       FROM journal_lines jl
       JOIN accounts a ON a.id=jl.account_id
       WHERE jl.entry_id=$1 ORDER BY jl.debit DESC`,
      [id],
    );
    return { ...entry.rows[0], lines: lines.rows };
  }

  // ── Expenses ───────────────────────────────────────────────────────────────

  async createExpenseCategory(companyId: string, dto: CreateExpenseCategoryDto) {
    const result = await this.db.query(
      `INSERT INTO expense_categories (company_id,name,description,account_id)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [companyId, dto.name, dto.description ?? null, dto.account_id ?? null],
    );
    return result.rows[0];
  }

  async getExpenseCategories(companyId: string) {
    const result = await this.db.query(
      `SELECT ec.*, a.name as account_name
       FROM expense_categories ec
       LEFT JOIN accounts a ON a.id=ec.account_id
       WHERE ec.company_id=$1 AND ec.is_active=true ORDER BY ec.name`,
      [companyId],
    );
    return result.rows;
  }

  async createExpense(companyId: string, userId: string, dto: CreateExpenseDto) {
    const taxAmount = dto.tax_amount ?? (dto.amount * 0.15);
    const total = dto.amount + taxAmount;
    const expenseNumber = `EXP-${Date.now()}`;
    const mode=dto.allocation_method||(dto.branch_id?'single':'head_office');
    let shares:Array<{branch_id:string;percent:number}>=[];
    const active=await this.db.query(`SELECT id FROM branches WHERE company_id=$1 AND is_active=true ORDER BY name`,[companyId]);
    const valid=new Set(active.rows.map((b:any)=>b.id));
    if(mode==='single'){
      if(!dto.branch_id||!valid.has(dto.branch_id))throw new BadRequestException('Select a valid branch');
      shares=[{branch_id:dto.branch_id,percent:100}];
    }else if(mode==='equal'){
      if(!active.rows.length)throw new BadRequestException('No active branches available');
      shares=active.rows.map((b:any)=>({branch_id:b.id,percent:100/active.rows.length}));
    }else if(mode==='manual'){
      shares=(dto.allocations||[]).filter(x=>valid.has(x.branch_id)&&Number(x.percent)>0).map(x=>({branch_id:x.branch_id,percent:Number(x.percent)}));
      const sum=shares.reduce((s,x)=>s+x.percent,0);
      if(!shares.length||Math.abs(sum-100)>.01)throw new BadRequestException('Manual branch allocation must total 100%');
    }else if(mode==='revenue'){
      const sales=await this.db.query(
        `SELECT b.id,COALESCE(SUM(o.total),0)::numeric revenue FROM branches b LEFT JOIN sales_orders o
         ON o.warehouse_id=b.warehouse_id AND o.status='paid' AND date_trunc('month',o.created_at)=date_trunc('month',$2::date)
         WHERE b.company_id=$1 AND b.is_active=true GROUP BY b.id`,[companyId,dto.date]);
      const sum=sales.rows.reduce((s:number,x:any)=>s+Number(x.revenue),0);
      if(sum<=0)throw new BadRequestException('Revenue allocation needs branch sales in the expense month');
      shares=sales.rows.filter((x:any)=>Number(x.revenue)>0).map((x:any)=>({branch_id:x.id,percent:Number(x.revenue)/sum*100}));
    }else if(mode!=='head_office')throw new BadRequestException('Invalid allocation method');
    return this.db.transaction(async client=>{
      const result=await client.query(
        `INSERT INTO expenses (company_id,branch_id,allocation_method,expense_number,category_id,date,description,
         amount,tax_amount,total,payment_method,vendor,receipt_ref,submitted_by,notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
        [companyId,mode==='single'?dto.branch_id:null,mode,expenseNumber,dto.category_id??null,dto.date,dto.description,
         dto.amount,taxAmount,total,dto.payment_method??'cash',dto.vendor??null,dto.receipt_ref??null,userId,dto.notes??null]);
      let allocatedAmount=0,allocatedTax=0;
      for(let i=0;i<shares.length;i++){
        const last=i===shares.length-1;
        const amount=last?dto.amount-allocatedAmount:Number((dto.amount*shares[i].percent/100).toFixed(2));
        const tax=last?taxAmount-allocatedTax:Number((taxAmount*shares[i].percent/100).toFixed(2));
        allocatedAmount+=amount;allocatedTax+=tax;
        await client.query(
          `INSERT INTO expense_allocations(id,expense_id,branch_id,allocation_percent,amount,tax_amount,total)
           VALUES($1,$2,$3,$4,$5,$6,$7)`,
          [randomUUID(),result.rows[0].id,shares[i].branch_id,shares[i].percent,amount,tax,amount+tax]);
      }
      return {...result.rows[0],allocations:shares};
    });
  }

  async getExpenses(companyId: string, from?: string, to?: string, categoryId?: string) {
    const conditions = ['e.company_id=$1'];
    const params: any[] = [companyId];
    let idx = 2;
    if (from)       { conditions.push(`e.date>=$${idx++}`);        params.push(from); }
    if (to)         { conditions.push(`e.date<=$${idx++}`);         params.push(to); }
    if (categoryId) { conditions.push(`e.category_id=$${idx++}`);  params.push(categoryId); }
    const result = await this.db.query(
      `SELECT e.*, ec.name as category_name, u.name as submitted_by_name,b.name as branch_name,
       COALESCE((SELECT json_agg(jsonb_build_object('branch_id',a.branch_id,'branch_name',ab.name,
       'percent',a.allocation_percent,'amount',a.amount,'tax_amount',a.tax_amount,'total',a.total) ORDER BY ab.name)
       FROM expense_allocations a JOIN branches ab ON ab.id=a.branch_id WHERE a.expense_id=e.id),'[]') allocations
       FROM expenses e
       LEFT JOIN expense_categories ec ON ec.id=e.category_id
       LEFT JOIN branches b ON b.id=e.branch_id
       JOIN users u ON u.id=e.submitted_by
       WHERE ${conditions.join(' AND ')}
       ORDER BY e.date DESC LIMIT 200`,
      params,
    );
    return result.rows;
  }

  // ── Reports ────────────────────────────────────────────────────────────────

  async getProfitLoss(companyId: string, from: string, to: string) {
    const revenue = await this.db.query(
      `SELECT COALESCE(SUM(total),0) as total
       FROM sales_orders WHERE company_id=$1 AND status='paid'
       AND created_at::date BETWEEN $2 AND $3`,
      [companyId, from, to],
    );
    const cogs = await this.db.query(
      `SELECT COALESCE(SUM(pol.unit_cost * grl.quantity_received),0) as total
       FROM goods_receipt_lines grl
       JOIN goods_receipts gr ON gr.id=grl.grn_id
       JOIN purchase_orders po ON po.id=gr.po_id
       JOIN purchase_order_lines pol ON pol.id=grl.po_line_id
       WHERE gr.company_id=$1 AND gr.received_at::date BETWEEN $2 AND $3`,
      [companyId, from, to],
    );
    const expensesResult = await this.db.query(
      `SELECT COALESCE(SUM(total),0) as total
       FROM expenses WHERE company_id=$1 AND date BETWEEN $2 AND $3`,
      [companyId, from, to],
    );
    const payrollResult = await this.db.query(
      `SELECT COALESCE(SUM(total_net),0) as total
       FROM payroll_runs WHERE company_id=$1 AND status != 'draft'
       AND MAKE_DATE(period_year, period_month, 1) BETWEEN $2::date AND $3::date`,
      [companyId, from, to],
    );

    const totalRevenue   = parseFloat(revenue.rows[0].total);
    const totalCOGS      = parseFloat(cogs.rows[0].total);
    const totalExpenses  = parseFloat(expensesResult.rows[0].total);
    const totalPayroll   = parseFloat(payrollResult.rows[0].total);
    const grossProfit    = totalRevenue - totalCOGS;
    const totalOpEx      = totalExpenses + totalPayroll;
    const netProfit      = grossProfit - totalOpEx;

    return {
      period: { from, to },
      revenue: totalRevenue,
      cogs: totalCOGS,
      gross_profit: grossProfit,
      gross_margin: totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(2) + '%' : '0%',
      operating_expenses: { expenses: totalExpenses, payroll: totalPayroll, total: totalOpEx },
      net_profit: netProfit,
      net_margin: totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) + '%' : '0%',
    };
  }

  async getVatReport(companyId: string, from: string, to: string) {
    const salesVat = await this.db.query(
      `SELECT COALESCE(SUM(tax_amount),0) as total, COALESCE(SUM(total),0) as gross
       FROM sales_orders WHERE company_id=$1 AND status='paid'
       AND created_at::date BETWEEN $2 AND $3`,
      [companyId, from, to],
    );
    const purchaseVat = await this.db.query(
      `SELECT COALESCE(SUM(tax_amount),0) as total, COALESCE(SUM(total),0) as gross
       FROM purchase_orders WHERE company_id=$1 AND status IN ('received','partially_received')
       AND created_at::date BETWEEN $2 AND $3`,
      [companyId, from, to],
    );
    const expenseVat = await this.db.query(
      `SELECT COALESCE(SUM(tax_amount),0) as total
       FROM expenses WHERE company_id=$1 AND date BETWEEN $2 AND $3`,
      [companyId, from, to],
    );
    const branchVat = await this.db.query(
      `SELECT b.id branch_id,b.name,
       COALESCE((SELECT SUM(o.tax_amount) FROM sales_orders o WHERE o.warehouse_id=b.warehouse_id
         AND o.status='paid' AND o.created_at::date BETWEEN $2 AND $3),0)::numeric output_vat,
       COALESCE((SELECT SUM(a.tax_amount) FROM expense_allocations a JOIN expenses e ON e.id=a.expense_id
         WHERE a.branch_id=b.id AND e.date BETWEEN $2 AND $3),0)::numeric expense_input_vat
       FROM branches b WHERE b.company_id=$1 AND b.is_active=true ORDER BY b.name`,
      [companyId,from,to],
    );

    const outputVat  = parseFloat(salesVat.rows[0].total);
    const inputVat   = parseFloat(purchaseVat.rows[0].total) + parseFloat(expenseVat.rows[0].total);
    const vatPayable = outputVat - inputVat;

    return {
      period: { from, to },
      output_vat:  { sales_gross: salesVat.rows[0].gross, vat: outputVat },
      input_vat:   { purchases_vat: purchaseVat.rows[0].total, expenses_vat: expenseVat.rows[0].total, total: inputVat },
      vat_payable: vatPayable,
      vat_rate: '15%',
      branches: branchVat.rows.map((b:any)=>({...b,net_vat:Number(b.output_vat)-Number(b.expense_input_vat)})),
    };
  }

  async getBalanceSheet(companyId: string) {
    const result = await this.db.query(
      `SELECT type, category, SUM(balance) as total
       FROM accounts WHERE company_id=$1 AND is_active=true
       GROUP BY type, category ORDER BY type, category`,
      [companyId],
    );
    const data: Record<string, any> = { assets: [], liabilities: [], equity: [], revenue: [], expenses: [] };
    for (const row of result.rows) {
      if (data[row.type + 's']) data[row.type + 's'].push(row);
      else if (data[row.type]) data[row.type].push(row);
    }
    return data;
  }

  async getCashFlow(companyId: string, from: string, to: string) {
    const inflow = await this.db.query(
      `SELECT COALESCE(SUM(amount),0) as total FROM payments
       WHERE order_id IN (SELECT id FROM sales_orders WHERE company_id=$1)
       AND paid_at::date BETWEEN $2 AND $3 AND status='completed'`,
      [companyId, from, to],
    );
    const outflow = await this.db.query(
      `SELECT COALESCE(SUM(total),0) as total FROM expenses
       WHERE company_id=$1 AND date BETWEEN $2 AND $3`,
      [companyId, from, to],
    );
    const payroll = await this.db.query(
      `SELECT COALESCE(SUM(total_net),0) as total FROM payroll_runs
       WHERE company_id=$1 AND status='paid'
       AND MAKE_DATE(period_year,period_month,1) BETWEEN $2::date AND $3::date`,
      [companyId, from, to],
    );
    const totalIn  = parseFloat(inflow.rows[0].total);
    const totalOut = parseFloat(outflow.rows[0].total) + parseFloat(payroll.rows[0].total);
    return {
      period: { from, to },
      inflows:  { sales_collections: totalIn },
      outflows: { expenses: outflow.rows[0].total, payroll: payroll.rows[0].total, total: totalOut },
      net_cash_flow: totalIn - totalOut,
    };
  }
}
