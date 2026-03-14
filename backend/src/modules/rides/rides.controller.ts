import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { RidesService } from './rides.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { UpdateRideDto } from './dto/update-ride.dto';
import { SearchRidesDto } from './dto/search-rides.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
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
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Procurar boleias disponíveis (público; autenticado filtra privadas)' })
  search(@Request() req, @Query() dto: SearchRidesDto) {
    return this.ridesService.search(dto, req.user?.id ?? null);
  }

  @Get('for-you')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Boleias que batem certo com os templates do utilizador' })
  findForUser(@Request() req) {
    return this.ridesService.findForUser(req.user.id);
  }

  @Get('available-now')
  @ApiOperation({ summary: 'Boleias que partem nas próximas 2h com lugares disponíveis' })
  findAvailableNow() {
    return this.ridesService.findAvailableNow();
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Histórico de boleias (como condutor e passageiro)' })
  findHistory(@Request() req) {
    return this.ridesService.findHistory(req.user.id);
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

  @Post(':id/on-the-way')
  @UseGuards(JwtAuthGuard, VerifiedUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Condutor anuncia que está a caminho — notifica passageiros confirmados' })
  onTheWay(@Request() req, @Param('id') id: string) {
    return this.ridesService.onTheWay(req.user.id, id);
  }

  @Post(':id/arrive')
  @UseGuards(JwtAuthGuard, VerifiedUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Condutor marca chegada ao ponto de encontro' })
  arrive(@Request() req, @Param('id') id: string) {
    return this.ridesService.arrive(req.user.id, id);
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard, VerifiedUserGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Marcar boleia como concluída e processar pagamentos' })
  complete(@Request() req, @Param('id') id: string) {
    return this.ridesService.complete(req.user.id, id);
  }
}

