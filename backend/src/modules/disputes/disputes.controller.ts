import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DisputesService } from './disputes.service';
import { CreateDisputeDto } from './dto/create-dispute.dto';

@ApiTags('Disputes')
@Controller('disputes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @ApiOperation({ summary: 'Abrir uma disputa para uma reserva concluída' })
  create(@Request() req: any, @Body() dto: CreateDisputeDto) {
    return this.disputesService.create(req.user.id, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Listar as minhas disputas' })
  findMine(@Request() req: any) {
    return this.disputesService.findMine(req.user.id);
  }
}
