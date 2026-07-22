import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { CreatePayrollDto, GeneratePayrollDto, UpdatePayrollDto, UpdatePayrollStatusDto } from './payroll.dto';
@Controller('payroll')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}
  @Get() findAll(@Query('month') m?: string, @Query('year') y?: string, @Query('employeeId') e?: string) { return this.service.findAll(m ? Number(m) : undefined, y ? Number(y) : undefined, e); }
  @Get('summary') summary(@Query('month') m: string, @Query('year') y: string) { return this.service.getMonthlySummary(Number(m), Number(y)); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreatePayrollDto) { return this.service.create(dto); }
  @Post('generate') generate(@Body() dto: GeneratePayrollDto) { return this.service.generate(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdatePayrollDto) { return this.service.update(id, dto); }
  @Put(':id/status') status(@Param('id') id: string, @Body() dto: UpdatePayrollStatusDto) { return this.service.updateStatus(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
