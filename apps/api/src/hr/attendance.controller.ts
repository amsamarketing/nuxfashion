import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { BulkAttendanceDto, CreateAttendanceDto, UpdateAttendanceDto } from './attendance.dto';
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}
  @Get() findAll(@Query('employeeId') e?: string, @Query('from') f?: string, @Query('to') t?: string) { return this.service.findAll(e, f, t); }
  @Get('date/:date') findByDate(@Param('date') d: string) { return this.service.findByDate(d); }
  @Get('summary/:employeeId') summary(@Param('employeeId') e: string, @Query('year') y: string, @Query('month') m: string) { return this.service.getMonthSummary(e, Number(y), Number(m)); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateAttendanceDto) { return this.service.create(dto); }
  @Post('bulk') bulk(@Body() dto: BulkAttendanceDto) { return this.service.bulkCreate(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateAttendanceDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
