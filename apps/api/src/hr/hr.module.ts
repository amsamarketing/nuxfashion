import { Module } from '@nestjs/common';
import { DepartmentsModule } from './departments.module';
import { DesignationsModule } from './designations.module';
import { EmployeesModule } from './employees.module';
import { AttendanceModule } from './attendance.module';
import { LeaveModule } from './leave.module';
import { PayrollModule } from './payroll.module';
import { HrManagementController } from './hr-management.controller';
import { HrManagementService } from './hr-management.service';
@Module({
  imports: [DepartmentsModule, DesignationsModule, EmployeesModule, AttendanceModule, LeaveModule, PayrollModule],
  controllers:[HrManagementController],
  providers:[HrManagementService],
  exports: [DepartmentsModule, DesignationsModule, EmployeesModule, AttendanceModule, LeaveModule, PayrollModule],
})
export class HrModule {}
