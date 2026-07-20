import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { LeaveRequestDto } from './dto/leave-request.dto';
import { ReviewLeaveDto } from './dto/review-leave.dto';
import { RunPayrollDto } from './dto/run-payroll.dto';

@Injectable()
export class HrService {
  constructor(private db: DatabaseService) {}

  // ── Departments ────────────────────────────────────────────────────────────

  async createDepartment(companyId: string, dto: CreateDepartmentDto) {
    const result = await this.db.query(
      `INSERT INTO departments (company_id,name,description,manager_id)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [companyId, dto.name, dto.description ?? null, dto.manager_id ?? null],
    );
    return result.rows[0];
  }

  async getDepartments(companyId: string) {
    const result = await this.db.query(
      `SELECT d.*, u.name as manager_name,
         COUNT(e.id) as employee_count
       FROM departments d
       LEFT JOIN users u ON u.id=d.manager_id
       LEFT JOIN employees e ON e.department_id=d.id AND e.status='active'
       WHERE d.company_id=$1 AND d.is_active=true
       GROUP BY d.id, u.name ORDER BY d.name`,
      [companyId],
    );
    return result.rows;
  }

  // ── Employees ──────────────────────────────────────────────────────────────

  async createEmployee(companyId: string, dto: CreateEmployeeDto) {
    const result = await this.db.query(
      `INSERT INTO employees (company_id,user_id,employee_number,full_name,national_id,phone,email,
         department_id,job_title,employment_type,hire_date,basic_salary,housing_allowance,transport_allowance,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [companyId, dto.user_id ?? null, dto.employee_number, dto.full_name, dto.national_id ?? null,
       dto.phone ?? null, dto.email ?? null, dto.department_id ?? null, dto.job_title ?? null,
       dto.employment_type ?? 'full_time', dto.hire_date, dto.basic_salary ?? 0,
       dto.housing_allowance ?? 0, dto.transport_allowance ?? 0, dto.notes ?? null],
    );
    return result.rows[0];
  }

  async getEmployees(companyId: string, departmentId?: string, status?: string) {
    const conditions = ['e.company_id=$1'];
    const params: any[] = [companyId];
    let idx = 2;
    if (departmentId) { conditions.push(`e.department_id=$${idx++}`); params.push(departmentId); }
    if (status)       { conditions.push(`e.status=$${idx++}`);        params.push(status); }
    const result = await this.db.query(
      `SELECT e.*, d.name as department_name
       FROM employees e
       LEFT JOIN departments d ON d.id=e.department_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY e.full_name`,
      params,
    );
    return result.rows;
  }

  async getEmployee(companyId: string, id: string) {
    const result = await this.db.query(
      `SELECT e.*, d.name as department_name
       FROM employees e
       LEFT JOIN departments d ON d.id=e.department_id
       WHERE e.id=$1 AND e.company_id=$2`,
      [id, companyId],
    );
    if (!result.rows[0]) throw new NotFoundException('Employee not found');
    return result.rows[0];
  }

  // ── Attendance ─────────────────────────────────────────────────────────────

  async recordAttendance(companyId: string, dto: RecordAttendanceDto) {
    let hoursWorked = null;
    if (dto.check_in && dto.check_out) {
      const diff = (new Date(dto.check_out).getTime() - new Date(dto.check_in).getTime()) / 3600000;
      hoursWorked = Math.max(0, diff - 1).toFixed(2); // minus 1hr break
    }
    const result = await this.db.query(
      `INSERT INTO attendance (company_id,employee_id,shift_id,date,check_in,check_out,status,hours_worked,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (employee_id,date) DO UPDATE SET
         check_in=EXCLUDED.check_in, check_out=EXCLUDED.check_out,
         status=EXCLUDED.status, hours_worked=EXCLUDED.hours_worked,
         shift_id=EXCLUDED.shift_id, notes=EXCLUDED.notes
       RETURNING *`,
      [companyId, dto.employee_id, dto.shift_id ?? null, dto.date,
       dto.check_in ?? null, dto.check_out ?? null, dto.status ?? 'present',
       hoursWorked, dto.notes ?? null],
    );
    return result.rows[0];
  }

  async getAttendance(companyId: string, employeeId?: string, from?: string, to?: string) {
    const conditions = ['a.company_id=$1'];
    const params: any[] = [companyId];
    let idx = 2;
    if (employeeId) { conditions.push(`a.employee_id=$${idx++}`); params.push(employeeId); }
    if (from)       { conditions.push(`a.date>=$${idx++}`);        params.push(from); }
    if (to)         { conditions.push(`a.date<=$${idx++}`);         params.push(to); }
    const result = await this.db.query(
      `SELECT a.*, e.full_name as employee_name, e.employee_number
       FROM attendance a
       JOIN employees e ON e.id=a.employee_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.date DESC, e.full_name LIMIT 500`,
      params,
    );
    return result.rows;
  }

  async getAttendanceSummary(companyId: string, month: number, year: number) {
    const result = await this.db.query(
      `SELECT e.id, e.employee_number, e.full_name,
         COUNT(CASE WHEN a.status='present' THEN 1 END) as present_days,
         COUNT(CASE WHEN a.status='absent'  THEN 1 END) as absent_days,
         COUNT(CASE WHEN a.status='late'    THEN 1 END) as late_days,
         COALESCE(SUM(a.hours_worked),0) as total_hours,
         COALESCE(SUM(a.overtime_hours),0) as overtime_hours
       FROM employees e
       LEFT JOIN attendance a ON a.employee_id=e.id
         AND EXTRACT(MONTH FROM a.date)=$2 AND EXTRACT(YEAR FROM a.date)=$3
       WHERE e.company_id=$1 AND e.status='active'
       GROUP BY e.id ORDER BY e.full_name`,
      [companyId, month, year],
    );
    return result.rows;
  }

  // ── Leave Requests ─────────────────────────────────────────────────────────

  async createLeaveRequest(companyId: string, dto: LeaveRequestDto) {
    const start = new Date(dto.start_date);
    const end   = new Date(dto.end_date);
    const days  = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
    if (days < 1) throw new BadRequestException('End date must be after start date');
    const result = await this.db.query(
      `INSERT INTO leave_requests (company_id,employee_id,type,start_date,end_date,days,reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [companyId, dto.employee_id, dto.type, dto.start_date, dto.end_date, days, dto.reason ?? null],
    );
    return result.rows[0];
  }

  async getLeaveRequests(companyId: string, status?: string) {
    const conditions = ['lr.company_id=$1'];
    const params: any[] = [companyId];
    if (status) { conditions.push('lr.status=$2'); params.push(status); }
    const result = await this.db.query(
      `SELECT lr.*, e.full_name as employee_name, e.employee_number
       FROM leave_requests lr
       JOIN employees e ON e.id=lr.employee_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY lr.created_at DESC`,
      params,
    );
    return result.rows;
  }

  async reviewLeave(companyId: string, reviewerId: string, id: string, dto: ReviewLeaveDto) {
    const result = await this.db.query(
      `UPDATE leave_requests SET status=$1, reviewed_by=$2, reviewed_at=NOW(), review_notes=$3
       WHERE id=$4 AND company_id=$5 AND status='pending' RETURNING *`,
      [dto.status, reviewerId, dto.review_notes ?? null, id, companyId],
    );
    if (!result.rows[0]) throw new NotFoundException('Pending leave request not found');
    return result.rows[0];
  }

  // ── Payroll ────────────────────────────────────────────────────────────────

  async runPayroll(companyId: string, userId: string, dto: RunPayrollDto) {
    const existing = await this.db.query(
      `SELECT id FROM payroll_runs WHERE company_id=$1 AND period_month=$2 AND period_year=$3`,
      [companyId, dto.period_month, dto.period_year],
    );
    if (existing.rows[0]) throw new BadRequestException('Payroll already run for this period');

    const employees = await this.db.query(
      `SELECT * FROM employees WHERE company_id=$1 AND status='active'`, [companyId],
    );

    // Get absent days for each employee this month
    const absences = await this.db.query(
      `SELECT employee_id, COUNT(*) as absent_days,
         COALESCE(SUM(overtime_hours),0) as overtime_hours,
         COUNT(CASE WHEN status='present' OR status='late' THEN 1 END) as working_days
       FROM attendance
       WHERE company_id=$1
         AND EXTRACT(MONTH FROM date)=$2 AND EXTRACT(YEAR FROM date)=$3
       GROUP BY employee_id`,
      [companyId, dto.period_month, dto.period_year],
    );
    const absMap: Record<string, any> = {};
    absences.rows.forEach((r: any) => { absMap[r.employee_id] = r; });

    let totalBasic = 0, totalAllowances = 0, totalDeductions = 0, totalNet = 0;
    const lines: any[] = [];

    const workingDaysInMonth = 26; // Standard Saudi working days

    for (const emp of employees.rows) {
      const att = absMap[emp.id] || { absent_days: 0, overtime_hours: 0, working_days: workingDaysInMonth };
      const absentDays = parseInt(att.absent_days) || 0;
      const overtimeHrs = parseFloat(att.overtime_hours) || 0;

      const dailyRate = emp.basic_salary / workingDaysInMonth;
      const deductAbsent = dailyRate * absentDays;
      const overtimePay = (emp.basic_salary / (workingDaysInMonth * 8)) * 1.5 * overtimeHrs;
      const grossSalary = emp.basic_salary + emp.housing_allowance + emp.transport_allowance;
      const gosiEmployee = emp.basic_salary * 0.10; // 10% employee contribution
      const gosiEmployer = emp.basic_salary * 0.12; // 12% employer contribution
      const netSalary = grossSalary + overtimePay - deductAbsent - gosiEmployee;

      totalBasic       += parseFloat(emp.basic_salary);
      totalAllowances  += parseFloat(emp.housing_allowance) + parseFloat(emp.transport_allowance);
      totalDeductions  += deductAbsent + gosiEmployee;
      totalNet         += netSalary;

      lines.push({ emp, absentDays, overtimePay, deductAbsent, gosiEmployee, gosiEmployer, netSalary,
                   workingDays: parseInt(att.working_days) || workingDaysInMonth });
    }

    const run = await this.db.query(
      `INSERT INTO payroll_runs (company_id,period_month,period_year,total_basic,total_allowances,total_deductions,total_net,processed_by,processed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) RETURNING *`,
      [companyId, dto.period_month, dto.period_year, totalBasic, totalAllowances, totalDeductions, totalNet, userId],
    );
    const runId = run.rows[0].id;

    for (const l of lines) {
      await this.db.query(
        `INSERT INTO payroll_lines (payroll_run_id,employee_id,basic_salary,housing_allowance,transport_allowance,
           overtime_pay,deduction_absent,gosi_employee,gosi_employer,net_salary,working_days,absent_days)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [runId, l.emp.id, l.emp.basic_salary, l.emp.housing_allowance, l.emp.transport_allowance,
         l.overtimePay, l.deductAbsent, l.gosiEmployee, l.gosiEmployer, l.netSalary,
         l.workingDays, l.absentDays],
      );
    }

    return { ...run.rows[0], employee_count: lines.length };
  }

  async getPayrollRuns(companyId: string) {
    const result = await this.db.query(
      `SELECT pr.*, u.name as processed_by_name,
         COUNT(pl.id) as employee_count
       FROM payroll_runs pr
       LEFT JOIN users u ON u.id=pr.processed_by
       LEFT JOIN payroll_lines pl ON pl.payroll_run_id=pr.id
       WHERE pr.company_id=$1
       GROUP BY pr.id, u.name
       ORDER BY pr.period_year DESC, pr.period_month DESC`,
      [companyId],
    );
    return result.rows;
  }

  async getPayrollDetails(companyId: string, runId: string) {
    const run = await this.db.query(
      `SELECT * FROM payroll_runs WHERE id=$1 AND company_id=$2`, [runId, companyId],
    );
    if (!run.rows[0]) throw new NotFoundException('Payroll run not found');
    const lines = await this.db.query(
      `SELECT pl.*, e.full_name, e.employee_number, e.job_title
       FROM payroll_lines pl
       JOIN employees e ON e.id=pl.employee_id
       WHERE pl.payroll_run_id=$1 ORDER BY e.full_name`,
      [runId],
    );
    return { ...run.rows[0], lines: lines.rows };
  }
}
