import { Controller, Get, Post, Patch, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HrService } from './hr.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { LeaveRequestDto } from './dto/leave-request.dto';
import { ReviewLeaveDto } from './dto/review-leave.dto';
import { RunPayrollDto } from './dto/run-payroll.dto';

@UseGuards(JwtAuthGuard)
@Controller('hr')
export class HrController {
  constructor(private readonly service: HrService) {}

  @Post('departments')
  createDepartment(@Body() dto: CreateDepartmentDto, @Req() req: Request) {
    return this.service.createDepartment((req.user as any).companyId, dto);
  }
  @Get('departments')
  getDepartments(@Req() req: Request) {
    return this.service.getDepartments((req.user as any).companyId);
  }

  @Post('employees')
  createEmployee(@Body() dto: CreateEmployeeDto, @Req() req: Request) {
    return this.service.createEmployee((req.user as any).companyId, dto);
  }
  @Get('employees')
  getEmployees(@Req() req: Request, @Query('department_id') dept?: string, @Query('status') status?: string) {
    return this.service.getEmployees((req.user as any).companyId, dept, status);
  }
  @Get('employees/:id')
  getEmployee(@Param('id') id: string, @Req() req: Request) {
    return this.service.getEmployee((req.user as any).companyId, id);
  }

  @Post('attendance')
  recordAttendance(@Body() dto: RecordAttendanceDto, @Req() req: Request) {
    return this.service.recordAttendance((req.user as any).companyId, dto);
  }
  @Get('attendance')
  getAttendance(@Req() req: Request, @Query('employee_id') empId?: string,
    @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.getAttendance((req.user as any).companyId, empId, from, to);
  }
  @Get('attendance/summary')
  getAttendanceSummary(@Req() req: Request, @Query('month') month: string, @Query('year') year: string) {
    return this.service.getAttendanceSummary((req.user as any).companyId, parseInt(month), parseInt(year));
  }

  @Post('leave')
  createLeaveRequest(@Body() dto: LeaveRequestDto, @Req() req: Request) {
    return this.service.createLeaveRequest((req.user as any).companyId, dto);
  }
  @Get('leave')
  getLeaveRequests(@Req() req: Request, @Query('status') status?: string) {
    return this.service.getLeaveRequests((req.user as any).companyId, status);
  }
  @Patch('leave/:id/review')
  reviewLeave(@Param('id') id: string, @Body() dto: ReviewLeaveDto, @Req() req: Request) {
    return this.service.reviewLeave((req.user as any).companyId, (req.user as any).sub, id, dto);
  }

  @Post('payroll/run')
  runPayroll(@Body() dto: RunPayrollDto, @Req() req: Request) {
    return this.service.runPayroll((req.user as any).companyId, (req.user as any).sub, dto);
  }
  @Get('payroll')
  getPayrollRuns(@Req() req: Request) {
    return this.service.getPayrollRuns((req.user as any).companyId);
  }
  @Get('payroll/:id')
  getPayrollDetails(@Param('id') id: string, @Req() req: Request) {
    return this.service.getPayrollDetails((req.user as any).companyId, id);
  }
}
