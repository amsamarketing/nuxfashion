import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmployeesService } from './employees.service';
@UseGuards(JwtAuthGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly service: EmployeesService) {}
  @Get() findAll(@Query('search') search: string, @Req() req: Request) { return this.service.findAll((req.user as any).companyId,search); }
  @Get(':id') findOne(@Param('id') id: string, @Req() req: Request) { return this.service.findOne((req.user as any).companyId,id); }
  @Post() create(@Body() body: any, @Req() req: Request) { return this.service.create((req.user as any).companyId,body); }
  @Put(':id') update(@Param('id') id: string, @Body() body: any, @Req() req: Request) { return this.service.update((req.user as any).companyId,id,body); }
  @Patch(':id') patch(@Param('id') id: string, @Body() body: any, @Req() req: Request) { return this.service.update((req.user as any).companyId,id,body); }
  @Delete(':id') remove(@Param('id') id: string, @Req() req: Request) { return this.service.remove((req.user as any).companyId,id); }
}
