import { Controller,Post,Body,Get,Req,UseGuards } from '@nestjs/common';
import { ApiTags,ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { Request } from 'express';
@ApiTags('Auth') @Controller('auth')
export class AuthController{
  constructor(private auth:AuthService){}
  @Post('login') login(@Body() dto:LoginDto,@Req() req:Request){return this.auth.login(dto,req.ip??req.socket?.remoteAddress??'unknown','admin')}
  @Post('pos-login') posLogin(@Body() dto:LoginDto,@Req() req:Request){return this.auth.login(dto,req.ip??req.socket?.remoteAddress??'unknown','pos')}
  @Get('me') @UseGuards(JwtAuthGuard) @ApiBearerAuth() getProfile(@Req() req:any){return this.auth.getProfile(req.user.sub)}
}
