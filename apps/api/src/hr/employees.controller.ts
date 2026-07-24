import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { EmployeesService } from './employees.service';
@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}
  @Get() findAll(@Query('search') search?: string) { return this.service.findAll(search); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() body: any) { return this.service.create(body); }
  @Put(':id') update(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }
  @Patch(':id') patch(@Param('id') id: string, @Body() body: any) { return this.service.update(id, body); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
