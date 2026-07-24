import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BranchesService } from './branches.service';

@UseGuards(JwtAuthGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly service: BranchesService) {}

  @Get()
  list(@Req() req: Request) {
    return this.service.list((req.user as any).companyId);
  }

  @Get('my')
  mine(@Req() req: Request) {
    return this.service.mine((req.user as any).companyId, (req.user as any).sub);
  }

  @Get('users')
  users(@Req() req: Request) {
    return this.service.users((req.user as any).companyId);
  }

  @Get('reports/performance')
  performance(@Query('from') from: string, @Query('to') to: string, @Req() req: Request) {
    return this.service.performance((req.user as any).companyId, from, to);
  }

  @Get(':id/report')
  report(@Param('id') id: string, @Query('from') from: string, @Query('to') to: string, @Req() req: Request) {
    return this.service.branchReport((req.user as any).companyId, id, from, to);
  }

  @Post()
  create(@Body() body: any, @Req() req: Request) {
    return this.service.create((req.user as any).companyId, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: Request) {
    return this.service.update((req.user as any).companyId, id, body);
  }

  @Post(':id/users')
  assignUsers(@Param('id') id: string, @Body() body: { user_ids?: string[] }, @Req() req: Request) {
    return this.service.assignUsers((req.user as any).companyId, id, body.user_ids || []);
  }

  @Get(':id/finance')
  finance(@Param('id') id: string, @Req() req: Request) {
    return this.service.finance((req.user as any).companyId, id);
  }

  @Post(':id/partners')
  addPartner(@Param('id') id: string, @Body() body: any, @Req() req: Request) {
    return this.service.savePartner((req.user as any).companyId, id, null, body);
  }

  @Patch(':id/partners/:partnerId')
  updatePartner(@Param('id') id: string, @Param('partnerId') partnerId: string, @Body() body: any, @Req() req: Request) {
    return this.service.savePartner((req.user as any).companyId, id, partnerId, body);
  }

  @Post(':id/accounts')
  addAccount(@Param('id') id: string, @Body() body: any, @Req() req: Request) {
    return this.service.saveAccount((req.user as any).companyId, id, null, body);
  }

  @Patch(':id/accounts/:accountId')
  updateAccount(@Param('id') id: string, @Param('accountId') accountId: string, @Body() body: any, @Req() req: Request) {
    return this.service.saveAccount((req.user as any).companyId, id, accountId, body);
  }

  @Post(':id/accounts/:accountId/adjustments')
  adjustAccount(@Param('id') id: string, @Param('accountId') accountId: string, @Body() body: any, @Req() req: Request) {
    return this.service.adjustAccount((req.user as any).companyId, (req.user as any).sub, id, accountId, body);
  }
}
