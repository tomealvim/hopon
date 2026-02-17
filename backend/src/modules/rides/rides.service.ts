import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { UpdateRideDto } from './dto/update-ride.dto';
import { SearchRidesDto } from './dto/search-rides.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RidesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateRideDto) {
    // Verificar se o veículo pertence ao utilizador
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, userId },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado ou não pertence ao utilizador');
    }

    // Verificar se há lugares suficientes
    if (dto.availableSeats > vehicle.seats) {
      throw new BadRequestException(`Número de lugares disponíveis (${dto.availableSeats}) excede os lugares do veículo (${vehicle.seats})`);
    }

    const ride = await this.prisma.ride.create({
      data: {
        driverId: userId,
        vehicleId: dto.vehicleId,
        origin: dto.origin,
        destination: dto.destination,
        departureTime: new Date(dto.departureTime),
        availableSeats: dto.availableSeats,
        price: dto.price ?? null,
        status: 'SCHEDULED',
      },
      include: {
        vehicle: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        driver: {
          include: {
            profile: true,
          },
        },
        bookings: true,
      },
    });

    return this.toResponse(ride);
  }

  async findAll(userId: string) {
    const rides = await this.prisma.ride.findMany({
      where: { driverId: userId },
      include: {
        vehicle: true,
        bookings: true,
      },
      orderBy: { departureTime: 'asc' },
    });

    return rides.map((ride) => this.toResponse(ride));
  }

  async findOne(userId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: {
        vehicle: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        driver: {
          include: {
            profile: true,
          },
        },
        bookings: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!ride) {
      throw new NotFoundException('Boleia não encontrada');
    }

    return this.toResponse(ride);
  }

  async search(dto: SearchRidesDto) {
    const where: any = {
      status: 'SCHEDULED',
    };

    if (dto.origin) {
      // SQLite não suporta mode: 'insensitive', usar contains simples
      where.origin = { contains: dto.origin };
    }

    if (dto.destination) {
      // SQLite não suporta mode: 'insensitive', usar contains simples
      where.destination = { contains: dto.destination };
    }

    if (dto.departureTimeFrom || dto.departureTimeTo) {
      where.departureTime = {};
      if (dto.departureTimeFrom) {
        where.departureTime.gte = new Date(dto.departureTimeFrom);
      }
      if (dto.departureTimeTo) {
        where.departureTime.lte = new Date(dto.departureTimeTo);
      }
    }

    if (dto.minSeats) {
      where.availableSeats = { gte: dto.minSeats };
    }

    const rides = await this.prisma.ride.findMany({
      where,
      include: {
        vehicle: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        driver: {
          include: {
            profile: true,
          },
        },
        bookings: true,
      },
      orderBy: { departureTime: 'asc' },
    });

    return rides.map((ride) => this.toResponse(ride));
  }

  async update(userId: string, rideId: string, dto: UpdateRideDto) {
    await this.ensureRideOwnership(userId, rideId);

    // Se estiver a atualizar lugares, verificar se há reservas
    if (dto.availableSeats !== undefined) {
      const ride = await this.prisma.ride.findUnique({
        where: { id: rideId },
        include: { bookings: true },
      });

      if (!ride) {
        throw new NotFoundException('Boleia não encontrada');
      }

      const bookedSeats = ride.bookings
        .filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING')
        .reduce((sum, b) => sum + b.seats, 0);

      if (dto.availableSeats < bookedSeats) {
        throw new BadRequestException(
          `Não é possível reduzir lugares para ${dto.availableSeats}. Já existem ${bookedSeats} lugares reservados.`,
        );
      }

      // Verificar se não excede os lugares do veículo
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: ride.vehicleId },
      });

      if (vehicle && dto.availableSeats > vehicle.seats) {
        throw new BadRequestException(`Número de lugares disponíveis (${dto.availableSeats}) excede os lugares do veículo (${vehicle.seats})`);
      }
    }

    const updateData: any = {};
    if (dto.origin !== undefined) updateData.origin = dto.origin;
    if (dto.destination !== undefined) updateData.destination = dto.destination;
    if (dto.departureTime !== undefined) updateData.departureTime = new Date(dto.departureTime);
    if (dto.availableSeats !== undefined) updateData.availableSeats = dto.availableSeats;
    if (dto.price !== undefined) updateData.price = dto.price;
    if (dto.status !== undefined) updateData.status = dto.status;

    const ride = await this.prisma.ride.update({
      where: { id: rideId },
      data: updateData,
      include: {
        vehicle: true,
        bookings: true,
      },
    });

    return this.toResponse(ride);
  }

  async remove(userId: string, rideId: string) {
    await this.ensureRideOwnership(userId, rideId);

    // Verificar se há reservas confirmadas
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { bookings: true },
    });

    if (!ride) {
      throw new NotFoundException('Boleia não encontrada');
    }

    const confirmedBookings = ride.bookings.filter((b) => b.status === 'CONFIRMED');

    if (confirmedBookings.length > 0) {
      throw new BadRequestException('Não é possível cancelar uma boleia com reservas confirmadas. Cancele primeiro as reservas.');
    }

    // Identificar todos os utilizadores que tinham reservas (mesmo canceladas)
    // para notificá-los antes de apagar
    const affectedUserIds = [...new Set(ride.bookings.map((b) => b.userId))];

    // Notificar utilizadores afetados (não bloqueia se falhar)
    if (affectedUserIds.length > 0) {
      try {
        await this.notificationsService.notifyRideCancelled(
          rideId,
          ride.origin,
          ride.destination,
          ride.departureTime,
          affectedUserIds,
        );
      } catch (error) {
        // Log do erro mas não bloqueia o cancelamento
        console.error('Erro ao enviar notificações de cancelamento:', error);
      }
    }

    // Apagar todas as reservas primeiro (devido ao ON DELETE RESTRICT)
    // Só apagamos se não houver CONFIRMED (já validado acima)
    await this.prisma.booking.deleteMany({
      where: { rideId },
    });

    // Agora podemos apagar a boleia
    await this.prisma.ride.delete({
      where: { id: rideId },
    });

    return { message: 'Boleia cancelada com sucesso' };
  }

  private async ensureRideOwnership(userId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
    });

    if (!ride) {
      throw new NotFoundException('Boleia não encontrada');
    }

    if (ride.driverId !== userId) {
      throw new ForbiddenException('Não tens permissão para modificar esta boleia');
    }
  }

  private toResponse(ride: any) {
    const bookedSeats = ride.bookings
      ? ride.bookings
          .filter((b: any) => b.status === 'CONFIRMED' || b.status === 'PENDING')
          .reduce((sum: number, b: any) => sum + b.seats, 0)
      : 0;

    return {
      id: ride.id,
      driverId: ride.driverId,
      vehicleId: ride.vehicleId,
      origin: ride.origin,
      destination: ride.destination,
      departureTime: ride.departureTime,
      availableSeats: ride.availableSeats,
      bookedSeats,
      remainingSeats: ride.availableSeats - bookedSeats,
      price: ride.price,
      status: ride.status,
      vehicle: ride.vehicle
        ? {
            id: ride.vehicle.id,
            brand: ride.vehicle.brand,
            model: ride.vehicle.model,
            color: ride.vehicle.color,
            imageUrl: ride.vehicle.imageUrl,
            seats: ride.vehicle.seats,
            features: ride.vehicle.features ? JSON.parse(ride.vehicle.features) : null,
          }
        : null,
      driver: ride.driver
        ? {
            id: ride.driver.id,
            email: ride.driver.email,
            phone: ride.driver.phone,
            profile: ride.driver.profile
              ? {
                  name: ride.driver.profile.name,
                  username: ride.driver.profile.username,
                  avatarUrl: ride.driver.profile.avatarUrl,
                }
              : null,
          }
        : null,
      bookings: ride.bookings
        ? ride.bookings.map((booking: any) => ({
            id: booking.id,
            userId: booking.userId,
            seats: booking.seats,
            status: booking.status,
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
          }))
        : [],
      createdAt: ride.createdAt,
      updatedAt: ride.updatedAt,
    };
  }
}

