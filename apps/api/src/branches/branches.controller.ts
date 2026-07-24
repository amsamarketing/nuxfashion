import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
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
}
