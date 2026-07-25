import {Body,Controller,Get,Param,Patch,Post,Query,Req,UseGuards} from '@nestjs/common';
import type {Request} from 'express';
import {JwtAuthGuard} from '../auth/guards/jwt-auth.guard';
import {HrManagementService as S} from './hr-management.service';
@UseGuards(JwtAuthGuard) @Controller('hr-management')
export class HrManagementController{
 constructor(private s:S){} private u(r:Request){return r.user as any}
 @Get('dashboard') dashboard(@Req()r:Request,@Query('branchId')b?:string){return this.s.dashboard(this.u(r),b)}
 @Get('employees') employees(@Req()r:Request,@Query()q:any){return this.s.employees(this.u(r),q)}
 @Get('employees/:id') employee(@Req()r:Request,@Param('id')id:string){return this.s.employee(this.u(r),id)}
 @Post('employees') createEmployee(@Req()r:Request,@Body()b:any){return this.s.createEmployee(this.u(r),b)}
 @Patch('employees/:id') updateEmployee(@Req()r:Request,@Param('id')id:string,@Body()b:any){return this.s.updateEmployee(this.u(r),id,b)}
 @Patch('employees/:id/status') employeeStatus(@Req()r:Request,@Param('id')id:string,@Body()b:any){return this.s.employeeStatus(this.u(r),id,b.status)}
 @Get('attendance') attendance(@Req()r:Request,@Query()q:any){return this.s.attendance(this.u(r),q)}
 @Post('attendance') recordAttendance(@Req()r:Request,@Body()b:any){return this.s.recordAttendance(this.u(r),b)}
 @Get('shifts') shifts(@Req()r:Request){return this.s.shifts(this.u(r))}
 @Post('shifts') createShift(@Req()r:Request,@Body()b:any){return this.s.createShift(this.u(r),b)}
 @Post('shifts/:id/assign') assignShift(@Req()r:Request,@Param('id')id:string,@Body()b:any){return this.s.assignShift(this.u(r),id,b)}
 @Get('leaves') leaves(@Req()r:Request,@Query()q:any){return this.s.leaves(this.u(r),q)}
 @Post('leaves') createLeave(@Req()r:Request,@Body()b:any){return this.s.createLeave(this.u(r),b)}
 @Patch('leaves/:id/review') reviewLeave(@Req()r:Request,@Param('id')id:string,@Body()b:any){return this.s.reviewLeave(this.u(r),id,b)}
 @Get('payroll') payroll(@Req()r:Request,@Query()q:any){return this.s.payroll(this.u(r),q)}
 @Post('payroll/generate') generatePayroll(@Req()r:Request,@Body()b:any){return this.s.generatePayroll(this.u(r),b)}
 @Patch('payroll/:id/paid') paid(@Req()r:Request,@Param('id')id:string,@Body()b:any){return this.s.markPaid(this.u(r),id,b)}
 @Get('requests') requests(@Req()r:Request,@Query()q:any){return this.s.requests(this.u(r),q)}
 @Post('requests') request(@Req()r:Request,@Body()b:any){return this.s.createRequest(this.u(r),b)}
 @Patch('requests/:id/status') requestStatus(@Req()r:Request,@Param('id')id:string,@Body()b:any){return this.s.requestStatus(this.u(r),id,b)}
 @Get('documents') documents(@Req()r:Request,@Query()q:any){return this.s.documents(this.u(r),q)}
 @Post('documents') document(@Req()r:Request,@Body()b:any){return this.s.createDocument(this.u(r),b)}
 @Patch('documents/:id') updateDocument(@Req()r:Request,@Param('id')id:string,@Body()b:any){return this.s.updateDocument(this.u(r),id,b)}
 @Get('reports/:type') report(@Req()r:Request,@Param('type')t:string,@Query()q:any){return this.s.report(this.u(r),t,q)}
 @Get('activity') activity(@Req()r:Request,@Query('limit')l?:string){return this.s.activity(this.u(r),Number(l||50))}
}
