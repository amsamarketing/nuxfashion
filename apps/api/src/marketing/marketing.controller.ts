import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MarketingService } from './marketing.service';

@UseGuards(JwtAuthGuard)
@Controller('marketing')
export class MarketingController {
  constructor(private readonly service:MarketingService){}
  private company(req:Request){ return (req.user as any).companyId; }
  private user(req:Request){ return (req.user as any).sub; }
  @Get('dashboard') dashboard(@Req() req:Request){ return this.service.dashboard(this.company(req)); }
  @Get('campaigns') campaigns(@Req() req:Request){ return this.service.campaigns(this.company(req)); }
  @Post('campaigns') createCampaign(@Req() req:Request,@Body() body:any){ return this.service.saveCampaign(this.company(req),this.user(req),body); }
  @Patch('campaigns/:id') updateCampaign(@Req() req:Request,@Param('id') id:string,@Body() body:any){ return this.service.saveCampaign(this.company(req),this.user(req),body,id); }
  @Delete('campaigns/:id') deleteCampaign(@Req() req:Request,@Param('id') id:string){ return this.service.deleteCampaign(this.company(req),id); }
  @Get('journeys') journeys(@Req() req:Request){ return this.service.journeys(this.company(req)); }
  @Post('journeys') createJourney(@Req() req:Request,@Body() body:any){ return this.service.saveJourney(this.company(req),body); }
  @Patch('journeys/:id') updateJourney(@Req() req:Request,@Param('id') id:string,@Body() body:any){ return this.service.saveJourney(this.company(req),body,id); }
  @Get('creatives') creatives(@Req() req:Request){ return this.service.creatives(this.company(req)); }
  @Post('creatives') createCreative(@Req() req:Request,@Body() body:any){ return this.service.saveCreative(this.company(req),body); }
  @Delete('creatives/:id') deleteCreative(@Req() req:Request,@Param('id') id:string){ return this.service.deleteCreative(this.company(req),id); }
  @Get('integrations') integrations(@Req() req:Request){ return this.service.integrations(this.company(req)); }
  @Patch('integrations/:provider') integration(@Req() req:Request,@Param('provider') provider:string,@Body() body:any){ return this.service.saveIntegration(this.company(req),provider,body); }
}
