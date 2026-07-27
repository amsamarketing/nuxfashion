import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExpensesService } from './expenses.service';

@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly service:ExpensesService){}
  private identity(req:Request){const u=req.user as any;return {companyId:u.companyId,userId:u.sub};}
  @Get('dashboard') dashboard(@Req() req:Request,@Query('from') from?:string,@Query('to') to?:string){return this.service.dashboard(this.identity(req).companyId,from,to);}
  @Get() findAll(@Req() req:Request,@Query() q:any){return this.service.findAll(this.identity(req).companyId,q);}
  @Post() create(@Req() req:Request,@Body() body:any){const x=this.identity(req);return this.service.create(x.companyId,x.userId,body);}
  @Patch(':id') update(@Req() req:Request,@Param('id') id:string,@Body() body:any){const x=this.identity(req);return this.service.update(x.companyId,x.userId,id,body);}
  @Patch(':id/submit') submit(@Req() req:Request,@Param('id') id:string){const x=this.identity(req);return this.service.transition(x.companyId,x.userId,id,'pending');}
  @Patch(':id/approve') approve(@Req() req:Request,@Param('id') id:string,@Body() body:any){const x=this.identity(req);return this.service.transition(x.companyId,x.userId,id,'approved',body?.comment);}
  @Patch(':id/reject') reject(@Req() req:Request,@Param('id') id:string,@Body() body:any){const x=this.identity(req);return this.service.transition(x.companyId,x.userId,id,'rejected',body?.comment);}
  @Post(':id/payments') pay(@Req() req:Request,@Param('id') id:string,@Body() body:any){const x=this.identity(req);return this.service.pay(x.companyId,x.userId,id,body);}
  @Get('categories/list') categories(@Req() req:Request){return this.service.categories(this.identity(req).companyId);}
  @Post('categories') createCategory(@Req() req:Request,@Body() body:any){return this.service.createCategory(this.identity(req).companyId,body);}
  @Get('supplier-payments/list') supplierPayments(@Req() req:Request){return this.service.supplierPayments(this.identity(req).companyId);}
  @Get('reports/summary') report(@Req() req:Request,@Query('from') from?:string,@Query('to') to?:string){return this.service.report(this.identity(req).companyId,from,to);}
}
