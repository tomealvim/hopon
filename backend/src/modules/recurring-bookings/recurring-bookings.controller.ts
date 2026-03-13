import { Controller, Get, Post, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { RecurringBookingsService } from './recurring-bookings.service';
import { CreateRecurringBookingDto } from './dto/create-recurring-booking.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('recurring-bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recurring-bookings')
export class RecurringBookingsController {
  constructor(private readonly service: RecurringBookingsService) {}

  @ApiOperation({ summary: 'Subscrever boleia recorrente' })
  @Post()
  create(@Request() req: any, @Body() dto: CreateRecurringBookingDto) {
    return this.service.create(req.user.userId, dto);
  }

  @ApiOperation({ summary: 'Listar as minhas subscrições recorrentes' })
  @Get('mine')
  findMine(@Request() req: any) {
    return this.service.findMine(req.user.userId);
  }

  @ApiOperation({ summary: 'Cancelar subscrição recorrente' })
  @Delete(':id')
  cancel(@Request() req: any, @Param('id') id: string) {
    return this.service.cancel(req.user.userId, id);
  }
}
