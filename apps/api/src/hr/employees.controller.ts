import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './employee.dto';
@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}
  @Get() findAll(@Query('search') search?: string) { return this.service.findAll(search); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateEmployeeDto) { return this.service.create(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
