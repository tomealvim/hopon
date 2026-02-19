import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateRideFromTemplateDto } from './dto/create-ride-from-template.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VerifiedUserGuard } from '../../common/guards/verified-user.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Schedules')
@Controller('schedules')
@UseGuards(JwtAuthGuard, VerifiedUserGuard)
@ApiBearerAuth()
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @ApiOperation({ summary: 'Criar template de horário recorrente' })
  create(@Request() req, @Body() dto: CreateScheduleDto) {
    return this.schedulesService.create(req.user.id, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Listar meus templates de horário' })
  findMySchedules(@Request() req) {
    return this.schedulesService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter template de horário por ID' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.schedulesService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar template de horário' })
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.schedulesService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar template de horário' })
  remove(@Request() req, @Param('id') id: string) {
    return this.schedulesService.remove(req.user.id, id);
  }

  @Post(':id/create-ride')
  @ApiOperation({ summary: 'Criar boleia a partir de um template de horário' })
  createRideFromTemplate(
    @Request() req,
    @Param('id') templateId: string,
    @Body() dto: CreateRideFromTemplateDto,
  ) {
    return this.schedulesService.createRideFromTemplate(req.user.id, templateId, dto);
  }
}
