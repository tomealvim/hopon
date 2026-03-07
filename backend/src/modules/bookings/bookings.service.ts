import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { InboxService } from '../inbox/inbox.service';
import { EventsService } from '../events/events.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StripeService } from '../stripe/stripe.service';

function getRefundFraction(departureTime: Date): number {
  const hoursUntil = (departureTime.getTime() - Date.now()) / 3_600_000;
  if (hoursUntil > 2) return 1.0;    // >2h — reembolso total
  if (hoursUntil > 0.5) return 0.5;  // 30min–2h — reembolso 50%
  return 0.0;                         // <30min — sem reembolso
}

// ── Algoritmo de desvio de rota ────────────────────────────────────────────

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointToSegmentMeters(
  pLat: number, pLng: number,
  aLat: number, aLng: number,
  bLat: number, bLng: number,
): number {
  const dx = bLat - aLat;
  const dy = bLng - aLng;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return haversineMeters(pLat, pLng, aLat, aLng);
  const t = Math.max(0, Math.min(1, ((pLat - aLat) * dx + (pLng - aLng) * dy) / lenSq));
  return haversineMeters(pLat, pLng, aLat + t * dx, aLng + t * dy);
}

/** Distância mínima (metros) de um ponto a uma polilinha de rota. */
function pointToPolylineMeters(
  lat: number,
  lng: number,
  polyline: { lat: number; lng: number }[],
): number {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1) return haversineMeters(lat, lng, polyline[0].lat, polyline[0].lng);
  let min = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = pointToSegmentMeters(lat, lng, polyline[i].lat, polyline[i].lng, polyline[i + 1].lat, polyline[i + 1].lng);
    if (d < min) min = d;
  }
  return min;
}

/** Label de desvio para notificações (português). */
function detourLabel(meters: number): string {
  if (meters <= 500) return 'na rota';
  if (meters <= 2000) return `${Math.round(meters)}m fora da rota (pequeno desvio)`;
  return `${(meters / 1000).toFixed(1)}km fora da rota`;
}

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inboxService: InboxService,
    private readonly eventsService: EventsService,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
    private readonly stripeService: StripeService,
  ) {}

  /** Criar PaymentIntent Stripe para pagar uma reserva diretamente */
  async createPaymentIntent(userId: string, rideId: string, seats: number) {
    const passenger = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passengerPolicyAcceptedAt: true },
    });
    if (!passenger?.passengerPolicyAcceptedAt) {
      throw new ForbiddenException('PASSENGER_POLICY_NOT_ACCEPTED');
    }

    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      select: { price: true, platformFee: true, status: true, availableSeats: true, driverId: true },
    });

    if (!ride) throw new NotFoundException('Boleia não encontrada');
    if (ride.status !== 'SCHEDULED') throw new BadRequestException('A boleia não está disponível para reservas');
    if (ride.driverId === userId) throw new BadRequestException('Não podes reservar lugar na tua própria boleia');
    if (!ride.price || Number(ride.price) <= 0) throw new BadRequestException('Esta boleia não tem custo — reserva diretamente.');

    const totalAmount = (Number(ride.price) + Number(ride.platformFee ?? 0)) * seats;

    return this.stripeService.createBookingPaymentIntent(userId, rideId, seats, totalAmount);
  }

  async create(userId: string, rideId: string, dto: CreateBookingDto) {
    // Verificar se o passageiro aceitou a política de viagens
    const passenger = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passengerPolicyAcceptedAt: true },
    });
    if (!passenger?.passengerPolicyAcceptedAt) {
      throw new ForbiddenException('PASSENGER_POLICY_NOT_ACCEPTED');
    }

    const isStripePayment = !!dto.stripePaymentIntentId;

    if (isStripePayment) {
      // Verificar PI Stripe (status, ownership, rideId)
      await this.stripeService.verifyBookingPaymentIntent(dto.stripePaymentIntentId!, userId, rideId);
    } else {
      // Pré-verificar saldo antes de criar a reserva (wallet path)
      const rideCheck = await this.prisma.ride.findUnique({ where: { id: rideId }, select: { price: true, platformFee: true } });
      if (rideCheck?.price != null && Number(rideCheck.price) > 0) {
        const needed = (Number(rideCheck.price) + Number(rideCheck.platformFee ?? 0)) * dto.seats;
        const wallet = await this.prisma.wallet.findFirst({ where: { userId } });
        const balance = wallet ? Number(wallet.balance) : 0;
        if (balance < needed) {
          throw new BadRequestException(
            `Saldo insuficiente. Tens €${balance.toFixed(2)}, mas precisas de €${needed.toFixed(2)}.`,
          );
        }
      }
    }

    const booking = await this.prisma.$transaction(async (tx) => {
      // Bloquear a linha da boleia — garante que reservas concorrentes ficam em fila
      // e não conseguem criar overbooking por race condition
      await tx.$queryRaw`SELECT id FROM rides WHERE id = ${rideId} FOR UPDATE`;

      const ride = await tx.ride.findUnique({
        where: { id: rideId },
        include: {
          bookings: {
            where: { status: { in: ['PENDING', 'CONFIRMED'] } },
          },
        },
      });

      if (!ride) throw new NotFoundException('Boleia não encontrada');

      if (ride.status !== 'SCHEDULED') {
        throw new BadRequestException('A boleia não está disponível para reservas');
      }

      if (ride.driverId === userId) {
        throw new BadRequestException('Não podes reservar lugar na tua própria boleia');
      }

      const alreadyBooked = ride.bookings.some((b) => b.userId === userId);
      if (alreadyBooked) {
        throw new BadRequestException('Já tens uma reserva ativa nesta boleia');
      }

      const bookedSeats = ride.bookings.reduce((sum, b) => sum + b.seats, 0);
      const remainingSeats = ride.availableSeats - bookedSeats;

      if (dto.seats > remainingSeats) {
        throw new BadRequestException(
          `Não há lugares suficientes. Restam ${remainingSeats} lugares disponíveis.`,
        );
      }

      // Prevenir double-use do mesmo PaymentIntent
      if (dto.stripePaymentIntentId) {
        const piUsed = await tx.booking.findFirst({
          where: { stripePaymentIntentId: dto.stripePaymentIntentId },
        });
        if (piUsed) throw new BadRequestException('Este pagamento já foi utilizado numa reserva.');
      }

      // Calcular desvio de rota se o passageiro forneceu ponto de embarque
      let detourMeters: number | null = null;
      let isOnRoute = false;
      if (
        dto.pickupLat != null &&
        dto.pickupLng != null &&
        ride.routePolyline != null
      ) {
        const polyline = ride.routePolyline as { lat: number; lng: number }[];
        detourMeters = Math.round(pointToPolylineMeters(dto.pickupLat, dto.pickupLng, polyline));
        isOnRoute = detourMeters <= 500;
      }

      // Auto-confirmar se instantBooking ativo e passageiro está na rota (≤500m)
      const autoConfirm = ride.instantBooking && isOnRoute;

      return tx.booking.create({
        data: {
          rideId,
          userId,
          seats: dto.seats,
          status: autoConfirm ? 'CONFIRMED' : 'PENDING',
          ...(dto.stripePaymentIntentId && {
            paymentMethod: 'STRIPE',
            stripePaymentIntentId: dto.stripePaymentIntentId,
          }),
          ...(dto.pickupLat != null && { pickupLat: dto.pickupLat }),
          ...(dto.pickupLng != null && { pickupLng: dto.pickupLng }),
          ...(detourMeters != null && { detourMeters }),
        },
        include: {
          ride: {
            include: {
              vehicle: true,
              driver: { include: { profile: true } },
            },
          },
          user: { include: { profile: true } },
        },
      });
    });

    // Debitar carteira do passageiro se a boleia tiver preço e pagamento for wallet
    if (!isStripePayment && booking.ride.price != null && Number(booking.ride.price) > 0) {
      const amount = (Number(booking.ride.price) + Number(booking.ride.platformFee ?? 0)) * booking.seats;
      try {
        await this.walletService.debit(
          userId,
          amount,
          `Boleia ${booking.ride.origin} → ${booking.ride.destination}`,
          booking.id,
        );
      } catch (err) {
        // Reverter: cancelar a reserva
        await this.prisma.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } });
        throw err;
      }
    }

    // Criar conversa entre condutor e passageiro
    let conversationId: string | null = null;
    try {
      const conv = await this.inboxService.createConversationForBooking(
        booking.id,
        rideId,
        booking.ride.driver.id,
        userId,
      );
      conversationId = conv.id;
    } catch (error) {
      console.error('[BookingsService] Erro ao criar conversa:', error);
    }

    const passengerName = booking.user?.profile?.name ?? booking.user?.email ?? 'Passageiro';
    const detourMeters = (booking as any).detourMeters as number | null;
    const isAutoConfirmed = booking.status === 'CONFIRMED';

    if (isAutoConfirmed) {
      // Passageiro na rota + instantBooking → notificar condutor que foi auto-confirmado
      void this.notificationsService.createNotification(
        booking.ride.driverId,
        'booking.new',
        'Reserva confirmada automaticamente',
        `${passengerName} reservou ${booking.seats} lugar(es) — ponto de embarque na tua rota.`,
        { bookingId: booking.id, rideId },
      );
    } else {
      // Notificar o driver via SSE que tem uma nova reserva
      const detourSuffix = detourMeters != null
        ? ` — ${detourLabel(detourMeters)}`
        : '';

      this.eventsService.emit(booking.ride.driverId, 'booking.new', {
        bookingId: booking.id,
        rideId,
        passengerId: userId,
        passengerName,
        seats: booking.seats,
        origin: booking.ride.origin,
        destination: booking.ride.destination,
        detourMeters: detourMeters ?? null,
      });

      // Notificação in-app para o driver com info de desvio
      void this.notificationsService.createNotification(
        booking.ride.driverId,
        'booking.new',
        'Nova reserva',
        `${passengerName} quer ${booking.seats} lugar(es) em ${booking.ride.origin} → ${booking.ride.destination}${detourSuffix}`,
        { bookingId: booking.id, rideId, detourMeters: detourMeters ?? undefined },
      );
    }

    // Notificar driver por email (assíncrono via queue)
    void this.notificationsService.queueBookingCreatedEmail(
      booking.ride.driver.email,
      booking.ride.driver.profile?.name ?? booking.ride.driver.email,
      passengerName,
      booking.ride.origin,
      booking.ride.destination,
      booking.ride.departureTime.toISOString(),
      booking.seats,
    );

    return this.toResponse(booking, conversationId);
  }

  async findMyBookings(userId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { userId },
      include: {
        ride: {
          include: {
            vehicle: true,
            driver: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings.map((booking) => this.toResponse(booking));
  }

  async updateStatus(driverId: string, bookingId: string, status: 'CONFIRMED' | 'DECLINED' | 'NO_SHOW') {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { ride: true },
    });

    if (!booking) throw new NotFoundException('Reserva não encontrada');
    if (booking.ride.driverId !== driverId) {
      throw new ForbiddenException('Só o condutor pode gerir reservas desta boleia');
    }

    // NO_SHOW: apenas quando ride.status === IN_PROGRESS e booking.status === CONFIRMED
    if (status === 'NO_SHOW') {
      if (booking.ride.status !== 'IN_PROGRESS') {
        throw new BadRequestException('Só é possível marcar no-show quando a boleia está IN_PROGRESS');
      }
      if (booking.status !== 'CONFIRMED') {
        throw new BadRequestException('Só é possível marcar no-show em reservas CONFIRMED');
      }
    } else {
      if (booking.status !== 'PENDING') {
        throw new BadRequestException('Só é possível alterar reservas com estado PENDING');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const upd = await tx.booking.update({
        where: { id: bookingId },
        data: { status },
        include: {
          ride: { include: { vehicle: true, driver: { include: { profile: true } } } },
          user: { include: { profile: true } },
        },
      });

      // Reembolsar passageiro via WALLET se recusado (apenas para pagamentos wallet)
      if (
        status === 'DECLINED' &&
        booking.ride.price != null &&
        Number(booking.ride.price) > 0 &&
        booking.paymentMethod !== 'STRIPE'
      ) {
        const amount = (Number(booking.ride.price) + Number(booking.ride.platformFee ?? 0)) * booking.seats;
        let wallet = await tx.wallet.findFirst({ where: { userId: booking.userId } });
        if (!wallet) wallet = await tx.wallet.create({ data: { userId: booking.userId } });
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } });
        await tx.walletTransaction.create({
          data: { walletId: wallet.id, type: 'REFUND', amount, description: 'Reserva recusada pelo condutor', reference: bookingId },
        });
      }

      // NO_SHOW: sem reembolso — condutor estava no ponto

      return upd;
    });

    // Reembolsar via Stripe se o pagamento foi feito com cartão e driver recusou
    if (
      status === 'DECLINED' &&
      booking.ride.price != null &&
      Number(booking.ride.price) > 0 &&
      booking.paymentMethod === 'STRIPE' &&
      booking.stripePaymentIntentId
    ) {
      const amount = (Number(booking.ride.price) + Number(booking.ride.platformFee ?? 0)) * booking.seats;
      try {
        await this.stripeService.createRefunds([
          { paymentIntentId: booking.stripePaymentIntentId, amountCents: Math.round(amount * 100) },
        ]);
      } catch {
        // Log mas não falhar — o admin pode reembolsar manualmente no Stripe Dashboard
      }
    }

    if (status === 'NO_SHOW') {
      // Notificar passageiro que foi marcado como no-show
      void this.notificationsService.createNotification(
        booking.userId,
        'booking.no_show',
        'Não apareceste!',
        `Foste marcado como não aparecido na boleia ${booking.ride.origin} → ${booking.ride.destination}. O valor pago não será reembolsado.`,
        { bookingId, rideId: booking.rideId },
      );
      this.eventsService.emit(booking.userId, 'booking.no_show', { bookingId, rideId: booking.rideId });
      return this.toResponse(updated);
    }

    const statusLabel = status === 'CONFIRMED' ? 'confirmada' : 'recusada';

    // Notificar passageiro via SSE
    this.eventsService.emit(booking.userId, 'booking.status', {
      bookingId,
      status,
      origin: booking.ride.origin,
      destination: booking.ride.destination,
    });

    // Notificação in-app para o passageiro
    void this.notificationsService.createNotification(
      booking.userId,
      `booking.${status.toLowerCase()}`,
      `Reserva ${statusLabel}`,
      `A tua reserva de ${booking.ride.origin} → ${booking.ride.destination} foi ${statusLabel}.`,
      { bookingId, rideId: booking.rideId },
    );

    // Notificar passageiro por email (assíncrono via queue)
    void this.notificationsService.queueBookingStatusEmail(
      updated.user.email,
      updated.user.profile?.name ?? updated.user.email,
      booking.ride.origin,
      booking.ride.destination,
      booking.ride.departureTime.toISOString(),
      status as 'CONFIRMED' | 'DECLINED',
    );

    return this.toResponse(updated);
  }

  async cancel(userId: string, bookingId: string) {
    // Verificar existência e ownership antes de tentar cancelar
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { ride: true },
    });

    if (!booking) throw new NotFoundException('Reserva não encontrada');
    if (booking.userId !== userId) throw new ForbiddenException('Não tens permissão para cancelar esta reserva');
    if (booking.status === 'COMPLETED') throw new BadRequestException('Não é possível cancelar uma reserva já completada');

    const refundFraction = getRefundFraction(booking.ride.departureTime);

    // Cancelar atomicamente (reembolso wallet dentro da transação; Stripe fora)
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.booking.updateMany({
        where: { id: bookingId, status: { notIn: ['CANCELLED', 'COMPLETED'] } },
        data: { status: 'CANCELLED' },
      });

      if (result.count === 0) throw new BadRequestException('A reserva já foi cancelada');

      // Reembolso wallet (apenas para pagamentos wallet)
      if (
        booking.ride.price != null &&
        Number(booking.ride.price) > 0 &&
        refundFraction > 0 &&
        booking.paymentMethod !== 'STRIPE'
      ) {
        const fullAmount = (Number(booking.ride.price) + Number(booking.ride.platformFee ?? 0)) * booking.seats;
        const refundAmount = fullAmount * refundFraction;
        const description =
          refundFraction === 1.0
            ? 'Cancelamento de reserva (reembolso total)'
            : 'Cancelamento de reserva (reembolso 50% — cancelamento entre 30min e 2h antes)';
        let wallet = await tx.wallet.findFirst({ where: { userId } });
        if (!wallet) wallet = await tx.wallet.create({ data: { userId } });
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: refundAmount } } });
        await tx.walletTransaction.create({
          data: { walletId: wallet.id, type: 'REFUND', amount: refundAmount, description, reference: bookingId },
        });
      }
    });

    // Reembolso Stripe (fora da transação — API externa)
    if (
      booking.ride.price != null &&
      Number(booking.ride.price) > 0 &&
      refundFraction > 0 &&
      booking.paymentMethod === 'STRIPE' &&
      booking.stripePaymentIntentId
    ) {
      const fullAmount = (Number(booking.ride.price) + Number(booking.ride.platformFee ?? 0)) * booking.seats;
      const refundAmount = fullAmount * refundFraction;
      try {
        await this.stripeService.createRefunds([
          { paymentIntentId: booking.stripePaymentIntentId, amountCents: Math.round(refundAmount * 100) },
        ]);
      } catch {
        // Log mas não falhar — admin pode reembolsar manualmente no Stripe Dashboard
      }
    }

    const updatedBooking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        ride: {
          include: {
            vehicle: true,
            driver: { include: { profile: true } },
          },
        },
        user: { include: { profile: true } },
      },
    });

    // Notificar condutor por email (assíncrono via queue)
    if (updatedBooking) {
      void this.notificationsService.queueBookingCancelledEmail(
        updatedBooking.ride.driver.email,
        updatedBooking.ride.driver.profile?.name ?? updatedBooking.ride.driver.email,
        updatedBooking.user?.profile?.name ?? updatedBooking.user?.email ?? 'Passageiro',
        updatedBooking.ride.origin,
        updatedBooking.ride.destination,
        updatedBooking.ride.departureTime.toISOString(),
      );
    }

    return this.toResponse(updatedBooking);
  }

  private toResponse(booking: any, conversationId?: string | null) {
    return {
      id: booking.id,
      rideId: booking.rideId,
      userId: booking.userId,
      seats: booking.seats,
      status: booking.status,
      paymentMethod: booking.paymentMethod ?? 'WALLET',
      ride: booking.ride
        ? {
            id: booking.ride.id,
            origin: booking.ride.origin,
            destination: booking.ride.destination,
            departureTime: booking.ride.departureTime,
            availableSeats: booking.ride.availableSeats,
            price: booking.ride.price,
            status: booking.ride.status,
            vehicle: booking.ride.vehicle
              ? {
                  id: booking.ride.vehicle.id,
                  brand: booking.ride.vehicle.brand,
                  model: booking.ride.vehicle.model,
                  color: booking.ride.vehicle.color,
                  imageUrl: booking.ride.vehicle.imageUrl,
                }
              : null,
            driver: booking.ride.driver
              ? {
                  id: booking.ride.driver.id,
                  email: booking.ride.driver.email,
                  phone: booking.ride.driver.phone,
                  isIdentityVerified: booking.ride.driver.isIdentityVerified ?? false,
                  profile: booking.ride.driver.profile
                    ? {
                        name: booking.ride.driver.profile.name,
                        username: booking.ride.driver.profile.username,
                        avatarUrl: booking.ride.driver.profile.avatarUrl,
                      }
                    : null,
                }
              : null,
          }
        : null,
      user: booking.user
        ? {
            id: booking.user.id,
            email: booking.user.email,
            phone: booking.user.phone,
            profile: booking.user.profile
              ? {
                  name: booking.user.profile.name,
                  username: booking.user.profile.username,
                  avatarUrl: booking.user.profile.avatarUrl,
                }
              : null,
          }
        : null,
      pickupLat: booking.pickupLat ?? null,
      pickupLng: booking.pickupLng ?? null,
      detourMeters: booking.detourMeters ?? null,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      conversationId: conversationId ?? null,
    };
  }
}

