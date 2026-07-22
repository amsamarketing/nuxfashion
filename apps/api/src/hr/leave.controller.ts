import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { ApproveLeaveDto, CreateLeaveRequestDto, CreateLeaveTypeDto, UpdateLeaveRequestDto, UpdateLeaveTypeDto } from './leave.dto';
import { LeaveStatus } from './leave.entity';
@Controller('leave-types')
export class LeaveTypesController {
  constructor(private readonly service: LeaveService) {}
  @Get() findAll() { return this.service.findAllTypes(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOneType(id); }
  @Post() create(@Body() dto: CreateLeaveTypeDto) { return this.service.createType(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateLeaveTypeDto) { return this.service.updateType(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.removeType(id); }
}
@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly service: LeaveService) {}
  @Get() findAll(@Query('employeeId') e?: string, @Query('status') s?: LeaveStatus) { return this.service.findAllRequests(e, s); }
  @Get('balance/:employeeId') balance(@Param('employeeId') e: string, @Query('year') y?: string) { return this.service.getLeaveBalance(e, Number(y || new Date().getFullYear())); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOneRequest(id); }
  @Post() create(@Body() dto: CreateLeaveRequestDto) { return this.service.createRequest(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateLeaveRequestDto) { return this.service.updateRequest(id, dto); }
  @Put(':id/approve') approve(@Param('id') id: string, @Body() dto: ApproveLeaveDto) { return this.service.approveRequest(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.removeRequest(id); }
}
