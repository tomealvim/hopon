import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UserRoutesService } from './user-routes.service';
import { CreateUserRouteDto } from './dto/create-user-route.dto';

@ApiTags('UserRoutes')
@Controller('user-routes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserRoutesController {
  constructor(private readonly service: UserRoutesService) {}

  @Post()
  @ApiOperation({ summary: 'Guardar rota habitual do passageiro' })
  create(@Request() req, @Body() dto: CreateUserRouteDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar rotas habituais do utilizador' })
  findAll(@Request() req) {
    return this.service.findAll(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Apagar rota habitual' })
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(req.user.id, id);
  }
}
