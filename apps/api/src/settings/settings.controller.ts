import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly service:SettingsService){}
  @Get() get(@Req() req:Request){ return this.service.get((req.user as any).companyId); }
  @Patch() update(@Req() req:Request,@Body() body:Record<string,unknown>){ return this.service.update((req.user as any).companyId,(req.user as any).sub,body); }
}
