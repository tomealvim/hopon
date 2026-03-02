import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { UpdateRideDto } from './dto/update-ride.dto';
import { SearchRidesDto } from './dto/search-rides.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { WalletService } from '../wallet/wallet.service';

const SEARCH_TTL_MS = 30_000;  // 30s
const FOR_YOU_TTL_MS = 60_000; // 60s

@Injectable()
export class RidesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly walletService: WalletService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async create(userId: string, dto: CreateRideDto) {
    // Verificar se o condutor aceitou a política de viagens
    const driver = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { driverPolicyAcceptedAt: true },
    });
    if (!driver?.driverPolicyAcceptedAt) {
      throw new ForbiddenException('DRIVER_POLICY_NOT_ACCEPTED');
    }

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

    // Criar registos de Location se houver coordenadas
    let originLocationId: string | null = null;
    let destinationLocationId: string | null = null;

    if (dto.originLat != null && dto.originLng != null) {
      const loc = await this.prisma.location.create({
        data: { label: dto.origin, lat: dto.originLat, lng: dto.originLng, city: dto.city ?? null },
      });
      originLocationId = loc.id;
    }

    if (dto.destinationLat != null && dto.destinationLng != null) {
      const loc = await this.prisma.location.create({
        data: { label: dto.destination, lat: dto.destinationLat, lng: dto.destinationLng },
      });
      destinationLocationId = loc.id;
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
        ...(originLocationId && { originLocationId }),
        ...(destinationLocationId && { destinationLocationId }),
        ...(dto.routeDistanceKm != null && { routeDistanceKm: dto.routeDistanceKm }),
        ...(dto.routeDurationMin != null && { routeDurationMin: dto.routeDurationMin }),
        ...(dto.routeTollCost != null && { routeTollCost: dto.routeTollCost }),
        ...(dto.platformFee != null && { platformFee: dto.platformFee }),
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
        originLocation: true,
        destinationLocation: true,
      },
    });

    // Invalidar cache de pesquisa para resultados imediatos
    void this.cache.clear();

    return this.toResponse(ride);
  }

  async findAll(userId: string) {
    const rides = await this.prisma.ride.findMany({
      where: { driverId: userId },
      include: {
        vehicle: true,
        bookings: {
          include: {
            user: { include: { profile: true } },
          },
        },
        originLocation: true,
        destinationLocation: true,
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
        originLocation: true,
        destinationLocation: true,
      },
    });

    if (!ride) {
      throw new NotFoundException('Boleia não encontrada');
    }

    return this.toResponse(ride);
  }

  async findForUser(userId: string) {
    const cacheKey = `rides:for-you:${userId}`;
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    // Obter templates ativos do utilizador
    const templates = await this.prisma.scheduleTemplate.findMany({
      where: { userId, active: true },
    });

    if (templates.length === 0) {
      await this.cache.set(cacheKey, [], FOR_YOU_TTL_MS);
      return [];
    }

    // Boleias futuras SCHEDULED que não são do próprio utilizador
    const now = new Date();
    const rides = await this.prisma.ride.findMany({
      where: {
        status: 'SCHEDULED',
        driverId: { not: userId },
        departureTime: { gte: now },
      },
      include: {
        vehicle: { include: { user: { include: { profile: true } } } },
        driver: { include: { profile: true } },
        bookings: true,
        originLocation: true,
        destinationLocation: true,
      },
    });

    const DAY_NAMES = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

    // matchScore acumula pontos por cada template que faz match com a ride
    const scores = new Map<string, { ride: (typeof rides)[0]; score: number }>();

    for (const template of templates) {
      const templateDays = template.daysOfWeek as string[];
      const [th, tm] = template.time.split(':').map(Number);
      const templateMin = th * 60 + tm;

      for (const ride of rides) {
        // Dia da semana
        const rideDay = DAY_NAMES[ride.departureTime.getDay()];
        if (!templateDays.includes(rideDay)) continue;

        // Hora ±30 min
        const rideMin = ride.departureTime.getHours() * 60 + ride.departureTime.getMinutes();
        const timeDiff = Math.abs(rideMin - templateMin);
        if (timeDiff > 30) continue;

        // Lugares disponíveis
        const booked = ride.bookings
          .filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING')
          .reduce((s, b) => s + b.seats, 0);
        if (ride.availableSeats - booked <= 0) continue;

        // Origem e destino — text overlap (normalizado, sem acentos)
        if (!this.textOverlap(ride.origin, template.origin)) continue;
        if (!this.textOverlap(ride.destination, template.destination)) continue;

        // Score: mais pontos quanto mais próximo no horário
        const timeScore = 30 - timeDiff;
        const prev = scores.get(ride.id);
        if (prev) {
          prev.score += timeScore + 10; // +10 por cada template adicional que faz match
        } else {
          scores.set(ride.id, { ride, score: timeScore });
        }
      }
    }

    const result = Array.from(scores.values())
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.ride.departureTime.getTime() - b.ride.departureTime.getTime(),
      )
      .map(({ ride, score }) => ({ ...this.toResponse(ride), matchScore: score }));
    await this.cache.set(cacheKey, result, FOR_YOU_TTL_MS);
    return result;
  }

  private textOverlap(a: string, b: string): boolean {
    const norm = (s: string) =>
      s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
    const na = norm(a);
    const nb = norm(b);
    return na.includes(nb) || nb.includes(na);
  }

  async search(dto: SearchRidesDto) {
    const cacheKey = `rides:search:${JSON.stringify(
      Object.fromEntries(Object.entries(dto).sort(([a], [b]) => a.localeCompare(b))),
    )}`;
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached) return cached;

    const where: any = {
      status: 'SCHEDULED',
    };

    if (dto.origin) {
      where.origin = { contains: dto.origin, mode: 'insensitive' };
    }

    if (dto.destination) {
      where.destination = { contains: dto.destination, mode: 'insensitive' };
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

    if (dto.maxPrice != null) {
      // Incluir boleias gratuitas (price null) e boleias até ao preço máximo
      where.OR = [{ price: null }, { price: { lte: dto.maxPrice } }];
    }

    // Pesquisa por proximidade: filtrar por IDs de rides cujo origin está dentro do raio
    if (dto.lat != null && dto.lng != null) {
      const radiusKm = dto.radius ?? 10;
      // Haversine em SQL — filtra locations de origem dentro do raio
      const nearbyOrigins = await this.prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM locations
        WHERE lat IS NOT NULL AND lng IS NOT NULL
          AND (
            6371 * acos(
              GREATEST(-1, LEAST(1,
                cos(radians(${dto.lat})) * cos(radians(lat)) *
                cos(radians(lng) - radians(${dto.lng})) +
                sin(radians(${dto.lat})) * sin(radians(lat))
              ))
            )
          ) <= ${radiusKm}
      `;
      const nearbyIds = nearbyOrigins.map((r) => r.id);
      where.originLocationId = { in: nearbyIds };
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
        originLocation: true,
        destinationLocation: true,
      },
      orderBy: { departureTime: 'asc' },
    });

    const result = rides.map((ride) => this.toResponse(ride));
    await this.cache.set(cacheKey, result, SEARCH_TTL_MS);
    return result;
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

    // Campos que afetam passageiros com reservas ativas — geram notificação
    const impactfulFields: string[] = [];
    if (dto.origin !== undefined) impactfulFields.push('origin');
    if (dto.destination !== undefined) impactfulFields.push('destination');
    if (dto.departureTime !== undefined) impactfulFields.push('departureTime');

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
        originLocation: true,
        destinationLocation: true,
      },
    });

    // Notificar passageiros com reservas ativas quando dados relevantes mudam
    if (impactfulFields.length > 0) {
      const affectedUserIds = [
        ...new Set(
          ride.bookings
            .filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING')
            .map((b) => b.userId),
        ),
      ];
      if (affectedUserIds.length > 0) {
        void this.notificationsService.notifyRideUpdated(
          rideId,
          ride.origin,
          ride.destination,
          ride.departureTime,
          impactfulFields,
          affectedUserIds,
        );
      }
    }

    return this.toResponse(ride);
  }

  async arrive(driverId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { bookings: true },
    });

    if (!ride) throw new NotFoundException('Boleia não encontrada');
    if (ride.driverId !== driverId) throw new ForbiddenException('Não tens permissão para gerir esta boleia');
    if (ride.status !== 'SCHEDULED') throw new BadRequestException('A boleia não está em estado SCHEDULED');

    await this.prisma.ride.update({
      where: { id: rideId },
      data: { status: 'IN_PROGRESS', arrivedAt: new Date() },
    });

    // Notificar passageiros CONFIRMED
    const confirmedPassengerIds = ride.bookings
      .filter((b) => b.status === 'CONFIRMED')
      .map((b) => b.userId);

    if (confirmedPassengerIds.length > 0) {
      void this.notificationsService.notifyDriverArrived(rideId, ride.origin, ride.destination, confirmedPassengerIds);
    }

    return { message: 'Chegada marcada. Passageiros notificados.' };
  }

  async complete(driverId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { bookings: true },
    });

    if (!ride) throw new NotFoundException('Boleia não encontrada');
    if (ride.driverId !== driverId) throw new ForbiddenException('Não tens permissão para concluir esta boleia');
    if (ride.status !== 'SCHEDULED' && ride.status !== 'IN_PROGRESS') {
      throw new BadRequestException('A boleia não está em estado SCHEDULED ou IN_PROGRESS');
    }

    const confirmedBookings = ride.bookings.filter((b) => b.status === 'CONFIRMED');
    const noShowBookings = ride.bookings.filter((b) => b.status === 'NO_SHOW');
    const pendingBookings = ride.bookings.filter((b) => b.status === 'PENDING');

    await this.prisma.$transaction(async (tx) => {
      await tx.ride.update({ where: { id: rideId }, data: { status: 'COMPLETED' } });

      // Marcar reservas confirmadas como concluídas
      for (const booking of confirmedBookings) {
        await tx.booking.update({ where: { id: booking.id }, data: { status: 'COMPLETED' } });
      }

      // NO_SHOW bookings mantêm status — condutor já estava no ponto, sem reembolso

      // Cancelar reservas pendentes e reembolsar (não chegaram a embarcar)
      for (const booking of pendingBookings) {
        await tx.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } });
        if (ride.price != null && Number(ride.price) > 0) {
          const amount = Number(ride.price) * booking.seats;
          let wallet = await tx.wallet.findFirst({ where: { userId: booking.userId } });
          if (!wallet) wallet = await tx.wallet.create({ data: { userId: booking.userId } });
          await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: amount } } });
          await tx.walletTransaction.create({
            data: { walletId: wallet.id, type: 'REFUND', amount, description: 'Boleia concluída sem confirmação', reference: booking.id },
          });
        }
      }

      // Creditar condutor pelo total das reservas confirmadas + NO_SHOW
      const paidBookings = [...confirmedBookings, ...noShowBookings];
      if (ride.price != null && Number(ride.price) > 0 && paidBookings.length > 0) {
        const totalAmount = paidBookings.reduce((sum, b) => sum + Number(ride.price) * b.seats, 0);
        let wallet = await tx.wallet.findFirst({ where: { userId: driverId } });
        if (!wallet) wallet = await tx.wallet.create({ data: { userId: driverId } });
        await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { increment: totalAmount } } });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'PAYOUT',
            amount: totalAmount,
            description: `Boleia concluída ${ride.origin} → ${ride.destination}`,
            reference: rideId,
          },
        });
      }
    });

    // Notificar passageiros confirmados: boleia concluída + prompt de avaliação
    for (const booking of confirmedBookings) {
      void this.notificationsService.createNotification(
        booking.userId,
        'ride.completed',
        'Boleia concluída!',
        `A tua boleia ${ride.origin} → ${ride.destination} foi concluída. Avalia o condutor!`,
        { bookingId: booking.id, rideId, driverId, role: 'passenger' },
      );
    }

    // Notificar o próprio condutor: prompt para avaliar passageiros
    if (confirmedBookings.length > 0 || noShowBookings.length > 0) {
      void this.notificationsService.createNotification(
        driverId,
        'ride.completed',
        'Boleia concluída!',
        `${ride.origin} → ${ride.destination} concluída. Avalia os teus passageiros!`,
        { rideId, role: 'driver' },
      );
    }

    // Invalidar cache — boleia COMPLETED não deve aparecer na pesquisa
    void this.cache.clear();

    return { message: 'Boleia concluída com sucesso' };
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

    // Reembolsar reservas pendentes (já foram debitadas)
    if (ride.price != null && Number(ride.price) > 0) {
      const pendingBookings = ride.bookings.filter((b) => b.status === 'PENDING');
      for (const booking of pendingBookings) {
        try {
          await this.walletService.refund(
            booking.userId,
            Number(ride.price) * booking.seats,
            'Boleia cancelada pelo condutor',
            booking.id,
          );
        } catch (err) {
          console.error(`[RidesService] Erro ao reembolsar booking ${booking.id}:`, err);
        }
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

    // Invalidar cache para a ride removida não aparecer nos resultados
    void this.cache.clear();

    return { message: 'Boleia cancelada com sucesso' };
  }

  async findHistory(userId: string) {
    // Boleias como condutor (COMPLETED | CANCELLED)
    const asDriver = await this.prisma.ride.findMany({
      where: { driverId: userId, status: { in: ['COMPLETED', 'CANCELLED'] } },
      include: {
        vehicle: true,
        driver: { include: { profile: true } },
        bookings: { include: { user: { include: { profile: true } } } },
        originLocation: true,
        destinationLocation: true,
      },
      orderBy: { departureTime: 'desc' },
    });

    // Boleias como passageiro (reserva COMPLETED | CANCELLED)
    const asPassenger = await this.prisma.booking.findMany({
      where: { userId, status: { in: ['COMPLETED', 'CANCELLED'] } },
      include: {
        ride: {
          include: {
            vehicle: true,
            driver: { include: { profile: true } },
            bookings: { include: { user: { include: { profile: true } } } },
            originLocation: true,
            destinationLocation: true,
          },
        },
      },
      orderBy: { ride: { departureTime: 'desc' } },
    });

    // Deduplicate (se for driver e passenger ao mesmo tempo — improvável mas seguro)
    const driverRideIds = new Set(asDriver.map((r) => r.id));
    const passengerRides = asPassenger
      .filter((b) => !driverRideIds.has(b.rideId))
      .map((b) => b.ride);

    const allRides = [...asDriver, ...passengerRides].sort(
      (a, b) => new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime(),
    );

    return allRides.map((ride) => ({
      ...this.toResponse(ride),
      role: ride.driverId === userId ? 'driver' : 'passenger',
    }));
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
      originLocation: ride.originLocation
        ? { id: ride.originLocation.id, label: ride.originLocation.label, lat: ride.originLocation.lat, lng: ride.originLocation.lng, city: ride.originLocation.city }
        : null,
      destinationLocation: ride.destinationLocation
        ? { id: ride.destinationLocation.id, label: ride.destinationLocation.label, lat: ride.destinationLocation.lat, lng: ride.destinationLocation.lng, city: ride.destinationLocation.city }
        : null,
      departureTime: ride.departureTime,
      availableSeats: ride.availableSeats,
      bookedSeats,
      remainingSeats: ride.availableSeats - bookedSeats,
      price: ride.price,
      routeDistanceKm: ride.routeDistanceKm ?? null,
      routeDurationMin: ride.routeDurationMin ?? null,
      routeTollCost: ride.routeTollCost ?? null,
      platformFee: ride.platformFee ?? null,
      status: ride.status,
      arrivedAt: ride.arrivedAt ?? null,
      vehicle: ride.vehicle
        ? {
            id: ride.vehicle.id,
            brand: ride.vehicle.brand,
            model: ride.vehicle.model,
            color: ride.vehicle.color,
            imageUrl: ride.vehicle.imageUrl,
            seats: ride.vehicle.seats,
            features: ride.vehicle.features ?? null,
          }
        : null,
      driver: ride.driver
        ? {
            id: ride.driver.id,
            email: ride.driver.email,
            phone: ride.driver.phone,
            isIdentityVerified: ride.driver.isIdentityVerified ?? false,
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

