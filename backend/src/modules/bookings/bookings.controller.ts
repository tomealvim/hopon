import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VerifiedUserGuard } from '../../common/guards/verified-user.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post('rides/:rideId/intent')
  @UseGuards(VerifiedUserGuard)
  @ApiOperation({
    summary: 'Criar PaymentIntent Stripe para pagar boleia diretamente',
  })
  createPaymentIntent(
    @Request() req,
    @Param('rideId') rideId: string,
    @Body() body: { seats?: number },
  ) {
    return this.bookingsService.createPaymentIntent(
      req.user.id,
      rideId,
      body.seats ?? 1,
    );
  }

  @Post('rides/:rideId')
  @UseGuards(VerifiedUserGuard)
  @ApiOperation({
    summary: 'Reservar lugar numa boleia (requer email e telefone verificados)',
  })
  create(
    @Request() req,
    @Param('rideId') rideId: string,
    @Body() dto: CreateBookingDto,
  ) {
    return this.bookingsService.create(req.user.id, rideId, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Listar minhas reservas' })
  findMyBookings(@Request() req) {
    return this.bookingsService.findMyBookings(req.user.id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Aceitar ou recusar reserva (só o condutor da boleia)',
  })
  updateStatus(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(req.user.id, id, dto.status);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancelar reserva' })
  cancel(@Request() req, @Param('id') id: string) {
    return this.bookingsService.cancel(req.user.id, id);
  }

  @Post(':id/confirm-presence')
  @ApiOperation({ summary: 'Confirmar presenca na boleia (passageiro)' })
  confirmPresence(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { present: boolean },
  ) {
    return this.bookingsService.confirmPresence(req.user.id, id, body.present);
  }
}
