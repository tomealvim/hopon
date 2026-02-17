import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, rideId: string, dto: CreateBookingDto) {
    // Verificar se a boleia existe e está disponível
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        bookings: true,
        vehicle: true,
      },
    });

    if (!ride) {
      throw new NotFoundException('Boleia não encontrada');
    }

    if (ride.status !== 'SCHEDULED') {
      throw new BadRequestException('A boleia não está disponível para reservas');
    }

    // Verificar se o utilizador não é o condutor
    if (ride.driverId === userId) {
      throw new BadRequestException('Não podes reservar lugar na tua própria boleia');
    }

    // Verificar se já tem uma reserva nesta boleia
    const existingBooking = await this.prisma.booking.findFirst({
      where: {
        rideId,
        userId,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    });

    if (existingBooking) {
      throw new BadRequestException('Já tens uma reserva ativa nesta boleia');
    }

    // Calcular lugares já reservados
    const bookedSeats = ride.bookings
      .filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING')
      .reduce((sum, b) => sum + b.seats, 0);

    // Verificar se há lugares suficientes
    const remainingSeats = ride.availableSeats - bookedSeats;

    if (dto.seats > remainingSeats) {
      throw new BadRequestException(
        `Não há lugares suficientes. Restam ${remainingSeats} lugares disponíveis.`,
      );
    }

    // Criar reserva dentro de uma transação
    const booking = await this.prisma.$transaction(async (tx) => {
      // Verificar novamente lugares disponíveis (double-check dentro da transação)
      const currentRide = await tx.ride.findUnique({
        where: { id: rideId },
        include: { bookings: true },
      });

      if (!currentRide) {
        throw new NotFoundException('Boleia não encontrada');
      }

      const currentBookedSeats = currentRide.bookings
        .filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING')
        .reduce((sum, b) => sum + b.seats, 0);

      const currentRemainingSeats = currentRide.availableSeats - currentBookedSeats;

      if (dto.seats > currentRemainingSeats) {
        throw new BadRequestException(
          `Não há lugares suficientes. Restam ${currentRemainingSeats} lugares disponíveis.`,
        );
      }

      // Criar a reserva
      return await tx.booking.create({
        data: {
          rideId,
          userId,
          seats: dto.seats,
          status: 'PENDING',
        },
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
          user: {
            include: {
              profile: true,
            },
          },
        },
      });
    });

    return this.toResponse(booking);
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

  async cancel(userId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        ride: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Reserva não encontrada');
    }

    if (booking.userId !== userId) {
      throw new ForbiddenException('Não tens permissão para cancelar esta reserva');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('A reserva já foi cancelada');
    }

    if (booking.status === 'COMPLETED') {
      throw new BadRequestException('Não é possível cancelar uma reserva já completada');
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
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
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    return this.toResponse(updatedBooking);
  }

  private toResponse(booking: any) {
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
    };
  }
}

