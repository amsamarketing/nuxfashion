import { Module } from '@nestjs/common';
import { DepartmentsModule } from './departments.module';
import { DesignationsModule } from './designations.module';
import { EmployeesModule } from './employees.module';
import { AttendanceModule } from './attendance.module';
import { LeaveModule } from './leave.module';
import { PayrollModule } from './payroll.module';
@Module({
  imports: [DepartmentsModule, DesignationsModule, EmployeesModule, AttendanceModule, LeaveModule, PayrollModule],
  exports: [DepartmentsModule, DesignationsModule, EmployeesModule, AttendanceModule, LeaveModule, PayrollModule],
})
export class HrModule {}
