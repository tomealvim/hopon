import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { RecurringArrangementsService } from './recurring-arrangements.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

class ProposeArrangementDto {
  @IsString() rideId: string;
  @IsString() passengerId: string;
  @IsOptional() @IsString() note?: string;
}

class RespondArrangementDto {
  @IsBoolean() accept: boolean;
}

@ApiTags('RecurringArrangements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recurring-arrangements')
export class RecurringArrangementsController {
  constructor(private readonly service: RecurringArrangementsService) {}

  @Post()
  @ApiOperation({
    summary:
      'Condutor propõe arranjo recorrente a passageiro de boleia concluída',
  })
  propose(@Request() req, @Body() dto: ProposeArrangementDto) {
    return this.service.propose(
      req.user.id,
      dto.rideId,
      dto.passengerId,
      dto.note,
    );
  }

  @Get('mine')
  @ApiOperation({
    summary: 'Listar os meus arranjos recorrentes (como condutor e passageiro)',
  })
  findMine(@Request() req) {
    return this.service.findMine(req.user.id);
  }

  @Patch(':id/respond')
  @ApiOperation({ summary: 'Passageiro aceita ou recusa proposta de arranjo' })
  respond(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RespondArrangementDto,
  ) {
    return this.service.respond(req.user.id, id, dto.accept);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Terminar arranjo recorrente' })
  end(@Request() req, @Param('id') id: string) {
    return this.service.end(req.user.id, id);
  }
}
