import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class EmployeesService {
  constructor(private db: DatabaseService) {}

  private async columns() {
    const result=await this.db.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema='public' AND table_name='employees'`,
    );
    return new Set<string>(result.rows.map((r:any)=>r.column_name));
  }

  private normalizedSelect() {
    return `e.*,
      COALESCE(NULLIF(to_jsonb(e)->>'full_name',''),
        NULLIF(TRIM(CONCAT(to_jsonb(e)->>'first_name',' ',to_jsonb(e)->>'last_name')),''),'Employee') full_name,
      COALESCE(to_jsonb(e)->>'employee_number',to_jsonb(e)->>'employee_id') employee_number,
      COALESCE(to_jsonb(e)->>'hire_date',to_jsonb(e)->>'joining_date') hire_date,
      COALESCE(to_jsonb(e)->>'employment_type','full_time') employment_type,
      COALESCE(NULLIF(to_jsonb(e)->>'housing_allowance','')::numeric,0) housing_allowance,
      COALESCE(NULLIF(to_jsonb(e)->>'transport_allowance','')::numeric,0) transport_allowance`;
  }

  async generateId() {
    const r=await this.db.query('SELECT COUNT(*) FROM employees');
    return 'EMP-'+String(Number(r.rows[0].count)+1).padStart(4,'0');
  }

  async findAll(search?:string) {
    const term=String(search||'').trim();
    const result=await this.db.query(
      `SELECT ${this.normalizedSelect()},d.name department_name
       FROM employees e
       LEFT JOIN departments d ON d.id=NULLIF(to_jsonb(e)->>'department_id','')::uuid
       WHERE $1='' OR COALESCE(to_jsonb(e)->>'full_name','') ILIKE $2
         OR COALESCE(to_jsonb(e)->>'first_name','') ILIKE $2
         OR COALESCE(to_jsonb(e)->>'last_name','') ILIKE $2
         OR COALESCE(to_jsonb(e)->>'email','') ILIKE $2
         OR COALESCE(to_jsonb(e)->>'employee_number',to_jsonb(e)->>'employee_id','') ILIKE $2
       ORDER BY e.created_at DESC`,
      [term,`%${term}%`],
    );
    return result.rows;
  }

  async findOne(id:string) {
    const result=await this.db.query(
      `SELECT ${this.normalizedSelect()},d.name department_name
       FROM employees e
       LEFT JOIN departments d ON d.id=NULLIF(to_jsonb(e)->>'department_id','')::uuid
       WHERE e.id=$1`,[id],
    );
    if(!result.rows[0])throw new NotFoundException('Employee not found');
    return result.rows[0];
  }

  private splitName(value:string) {
    const parts=String(value||'').trim().split(/\s+/);
    return {first:parts.shift()||'',last:parts.join(' ')||'-'};
  }

  async create(body:any) {
    const cols=await this.columns();
    const fullName=String(body.full_name||body.fullName||[body.firstName,body.lastName].filter(Boolean).join(' ')).trim();
    const email=String(body.email||'').trim().toLowerCase();
    const hireDate=body.hire_date||body.hireDate||body.joiningDate;
    if(!fullName)throw new BadRequestException('Employee name is required');
    if(!hireDate)throw new BadRequestException('Hire date is required');
    const employeeNumber=String(body.employee_number||body.employeeNumber||await this.generateId()).trim();
    const names=this.splitName(fullName);
    const candidates:Record<string,any>={
      employee_number:employeeNumber,employee_id:employeeNumber,
      full_name:fullName,first_name:names.first,last_name:names.last,
      email:email||null,phone:body.phone||null,address:body.address||null,
      national_id:body.national_id||body.nationalId||null,
      department_id:body.department_id||body.departmentId||null,
      designation_id:body.designation_id||body.designationId||null,
      job_title:body.job_title||body.jobTitle||null,
      employment_type:body.employment_type||body.employmentType||'full_time',
      hire_date:hireDate,joining_date:hireDate,
      basic_salary:Number(body.basic_salary??body.basicSalary??0),
      housing_allowance:Number(body.housing_allowance??body.housingAllowance??0),
      transport_allowance:Number(body.transport_allowance??body.transportAllowance??0),
      gender:body.gender||null,date_of_birth:body.date_of_birth||body.dateOfBirth||null,
      bank_account:body.bank_account||body.bankAccount||null,
      bank_name:body.bank_name||body.bankName||null,
      avatar_url:body.avatar_url||body.avatarUrl||null,
      notes:body.notes||null,status:body.status||'active',is_active:true,
    };
    const entries=Object.entries(candidates).filter(([key])=>cols.has(key));
    if(!entries.length)throw new BadRequestException('Employee table schema is not configured');
    const fields=entries.map(([key])=>`"${key}"`).join(',');
    const placeholders=entries.map((_,i)=>`$${i+1}`).join(',');
    const result=await this.db.query(
      `INSERT INTO employees(${fields}) VALUES(${placeholders}) RETURNING *`,
      entries.map(([,value])=>value),
    );
    return result.rows[0];
  }

  async update(id:string,body:any) {
    await this.findOne(id);
    const cols=await this.columns();
    const current=await this.db.query(`SELECT * FROM employees WHERE id=$1`,[id]);
    const old=current.rows[0],oldJson:any=old;
    const fullName=String(body.full_name||body.fullName||oldJson.full_name||[body.firstName||oldJson.first_name,body.lastName||oldJson.last_name].filter(Boolean).join(' ')).trim();
    const names=this.splitName(fullName);
    const candidates:Record<string,any>={
      employee_number:body.employee_number,employee_id:body.employee_number,
      full_name:fullName,first_name:names.first,last_name:names.last,
      email:body.email,phone:body.phone,address:body.address,
      national_id:body.national_id,department_id:body.department_id,
      job_title:body.job_title,employment_type:body.employment_type,
      hire_date:body.hire_date,joining_date:body.hire_date,
      basic_salary:body.basic_salary===undefined?undefined:Number(body.basic_salary),
      housing_allowance:body.housing_allowance===undefined?undefined:Number(body.housing_allowance),
      transport_allowance:body.transport_allowance===undefined?undefined:Number(body.transport_allowance),
      bank_account:body.bank_account,bank_name:body.bank_name,notes:body.notes,status:body.status,
    };
    const entries=Object.entries(candidates).filter(([key,value])=>cols.has(key)&&value!==undefined);
    if(cols.has('updated_at'))entries.push(['updated_at',new Date()]);
    if(!entries.length)return old;
    const sets=entries.map(([key],i)=>`"${key}"=$${i+1}`).join(',');
    const result=await this.db.query(
      `UPDATE employees SET ${sets} WHERE id=$${entries.length+1} RETURNING *`,
      [...entries.map(([,value])=>value??null),id],
    );
    return result.rows[0];
  }

  async remove(id:string) {
    await this.findOne(id);
    await this.db.query('DELETE FROM employees WHERE id=$1',[id]);
    return {message:'Deleted'};
  }
}
