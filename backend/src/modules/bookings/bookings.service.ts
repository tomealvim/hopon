import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { InboxService } from '../inbox/inbox.service';
import { EventsService } from '../events/events.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inboxService: InboxService,
    private readonly eventsService: EventsService,
    private readonly walletService: WalletService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, rideId: string, dto: CreateBookingDto) {
    // Pré-verificar saldo antes de criar a reserva
    const rideCheck = await this.prisma.ride.findUnique({ where: { id: rideId }, select: { price: true } });
    if (rideCheck?.price != null && Number(rideCheck.price) > 0) {
      const needed = Number(rideCheck.price) * dto.seats;
      const wallet = await this.prisma.wallet.findFirst({ where: { userId } });
      const balance = wallet ? Number(wallet.balance) : 0;
      if (balance < needed) {
        throw new BadRequestException(
          `Saldo insuficiente. Tens €${balance.toFixed(2)}, mas precisas de €${needed.toFixed(2)}.`,
        );
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

      return tx.booking.create({
        data: { rideId, userId, seats: dto.seats, status: 'PENDING' },
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

    // Debitar carteira do passageiro se a boleia tiver preço
    if (booking.ride.price != null && Number(booking.ride.price) > 0) {
      const amount = Number(booking.ride.price) * booking.seats;
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

    // Notificar o driver via SSE que tem uma nova reserva
    this.eventsService.emit(booking.ride.driverId, 'booking.new', {
      bookingId: booking.id,
      rideId,
      passengerId: userId,
      passengerName: booking.user?.profile?.name ?? booking.user?.email ?? 'Passageiro',
      seats: booking.seats,
      origin: booking.ride.origin,
      destination: booking.ride.destination,
    });

    // Notificar driver por email (assíncrono via queue)
    void this.notificationsService.queueBookingCreatedEmail(
      booking.ride.driver.email,
      booking.ride.driver.profile?.name ?? booking.ride.driver.email,
      booking.user?.profile?.name ?? booking.user?.email ?? 'Passageiro',
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

  async updateStatus(driverId: string, bookingId: string, status: 'CONFIRMED' | 'DECLINED') {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { ride: true },
    });

    if (!booking) throw new NotFoundException('Reserva não encontrada');
    if (booking.ride.driverId !== driverId) {
      throw new ForbiddenException('Só o condutor pode gerir reservas desta boleia');
    }
    if (booking.status !== 'PENDING') {
      throw new BadRequestException('Só é possível alterar reservas com estado PENDING');
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

      // Reembolsar passageiro se recusado e boleia tinha preço
      if (status === 'DECLINED' && booking.ride.price != null && Number(booking.ride.price) > 0) {
        const amount = Number(booking.ride.price) * booking.seats;
        let wallet = await tx.wallet.findFirst({ where: { userId: booking.userId } });
        if (!wallet) wallet = await tx.wallet.create({ data: { userId: booking.userId } });
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } });
        await tx.walletTransaction.create({
          data: { walletId: wallet.id, type: 'REFUND', amount, description: 'Reserva recusada pelo condutor', reference: bookingId },
        });
      }

      return upd;
    });

    // Notificar passageiro via SSE
    this.eventsService.emit(booking.userId, 'booking.status', {
      bookingId,
      status,
      origin: booking.ride.origin,
      destination: booking.ride.destination,
    });

    // Notificar passageiro por email (assíncrono via queue)
    void this.notificationsService.queueBookingStatusEmail(
      updated.user.email,
      updated.user.profile?.name ?? updated.user.email,
      booking.ride.origin,
      booking.ride.destination,
      booking.ride.departureTime.toISOString(),
      status,
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

    // Cancelar e reembolsar atomicamente
    await this.prisma.$transaction(async (tx) => {
      const result = await tx.booking.updateMany({
        where: { id: bookingId, status: { notIn: ['CANCELLED', 'COMPLETED'] } },
        data: { status: 'CANCELLED' },
      });

      if (result.count === 0) throw new BadRequestException('A reserva já foi cancelada');

      // Reembolsar se boleia tinha preço
      if (booking.ride.price != null && Number(booking.ride.price) > 0) {
        const amount = Number(booking.ride.price) * booking.seats;
        let wallet = await tx.wallet.findFirst({ where: { userId } });
        if (!wallet) wallet = await tx.wallet.create({ data: { userId } });
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } });
        await tx.walletTransaction.create({
          data: { walletId: wallet.id, type: 'REFUND', amount, description: 'Cancelamento de reserva', reference: bookingId },
        });
      }
    });

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
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      conversationId: conversationId ?? null,
    };
  }
}

