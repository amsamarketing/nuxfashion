import { Body, Controller, ForbiddenException, Get, Patch, Post, Param, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly service:SettingsService){}
  private requireAdmin(req:Request){const u:any=req.user||{},role=String(u.role||'').toLowerCase();if(!role.includes('admin')&&!Array.isArray(u.roles))throw new ForbiddenException('Administrator access is required');if(Array.isArray(u.roles)&&u.roles.length&&!u.roles.some((r:string)=>['super_admin','admin'].includes(r))&&!role.includes('admin'))throw new ForbiddenException('Administrator access is required')}
  @Get() get(@Req() req:Request){ return this.service.get((req.user as any).companyId); }
  @Patch() update(@Req() req:Request,@Body() body:Record<string,unknown>){ return this.service.update((req.user as any).companyId,(req.user as any).sub,body); }
  @Get('roles') roles(@Req() req:Request){this.requireAdmin(req);return this.service.roles((req.user as any).companyId)}
  @Patch('roles/:id') updateRole(@Req() req:Request,@Param('id') id:string,@Body() body:any){this.requireAdmin(req);return this.service.updateRole((req.user as any).companyId,id,body.permissions)}
  @Get('users') users(@Req() req:Request){this.requireAdmin(req);return this.service.users((req.user as any).companyId)}
  @Post('users') createUser(@Req() req:Request,@Body() body:any){this.requireAdmin(req);return this.service.createUser((req.user as any).companyId,body)}
  @Patch('users/:id') updateUser(@Req() req:Request,@Param('id') id:string,@Body() body:any){this.requireAdmin(req);return this.service.updateUser((req.user as any).companyId,id,{...body,current_user_id:(req.user as any).sub})}
  @Post('users/:id/password') password(@Req() req:Request,@Param('id') id:string,@Body() body:any){this.requireAdmin(req);return this.service.changePassword((req.user as any).companyId,id,body.password)}
}
