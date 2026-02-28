import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { InboxService } from '../inbox/inbox.service';
import { EventsService } from '../events/events.service';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inboxService: InboxService,
    private readonly eventsService: EventsService,
  ) {}

  async create(userId: string, rideId: string, dto: CreateBookingDto) {
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

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        ride: { include: { vehicle: true, driver: { include: { profile: true } } } },
        user: { include: { profile: true } },
      },
    });

    // Notificar passageiro via SSE
    this.eventsService.emit(booking.userId, 'booking.status', {
      bookingId,
      status,
      origin: booking.ride.origin,
      destination: booking.ride.destination,
    });

    return this.toResponse(updated);
  }

  async cancel(userId: string, bookingId: string) {
    // Verificar existência e ownership antes de tentar cancelar
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) throw new NotFoundException('Reserva não encontrada');
    if (booking.userId !== userId) throw new ForbiddenException('Não tens permissão para cancelar esta reserva');
    if (booking.status === 'COMPLETED') throw new BadRequestException('Não é possível cancelar uma reserva já completada');

    // Update condicional atómico — só cancela se ainda estiver em estado cancelável
    // Previne que dois pedidos simultâneos cancelem a mesma reserva duas vezes
    const result = await this.prisma.booking.updateMany({
      where: { id: bookingId, status: { notIn: ['CANCELLED', 'COMPLETED'] } },
      data: { status: 'CANCELLED' },
    });

    if (result.count === 0) {
      throw new BadRequestException('A reserva já foi cancelada');
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

