import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { DesignationsService } from './designations.service';
import { CreateDesignationDto, UpdateDesignationDto } from './designation.dto';
@Controller('designations')
export class DesignationsController {
  constructor(private readonly service: DesignationsService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateDesignationDto) { return this.service.create(dto); }
  @Put(':id') update(@Param('id') id: string, @Body() dto: UpdateDesignationDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
