import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { RidesService } from './rides.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { UpdateRideDto } from './dto/update-ride.dto';
import { SearchRidesDto } from './dto/search-rides.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VerifiedUserGuard } from '../../common/guards/verified-user.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Rides')
@Controller('rides')
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, VerifiedUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar nova boleia (requer email e telefone verificados)' })
  create(@Request() req, @Body() dto: CreateRideDto) {
    return this.ridesService.create(req.user.id, dto);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar minhas boleias' })
  findMyRides(@Request() req) {
    return this.ridesService.findAll(req.user.id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Procurar boleias disponíveis (público)' })
  search(@Query() dto: SearchRidesDto) {
    return this.ridesService.search(dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, VerifiedUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter detalhes de uma boleia (requer email e telefone verificados)' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.ridesService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, VerifiedUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar boleia (requer email e telefone verificados)' })
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateRideDto) {
    return this.ridesService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, VerifiedUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancelar boleia (requer email e telefone verificados)' })
  remove(@Request() req, @Param('id') id: string) {
    return this.ridesService.remove(req.user.id, id);
  }
}

