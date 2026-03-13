import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany();
  }

  async getMyImpact(userId: string) {
    // Boleias completadas como passageiro
    const passengerBookings = await this.prisma.booking.findMany({
      where: {
        userId,
        status: 'COMPLETED',
      },
      include: {
        ride: { select: { routeDistanceKm: true, price: true } },
      },
    });

    // Boleias completadas como condutor
    const driverRides = await this.prisma.ride.findMany({
      where: { driverId: userId, status: 'COMPLETED' },
      select: {
        routeDistanceKm: true,
        bookings: { where: { status: 'COMPLETED' }, select: { seats: true } },
      },
    });

    // CO2 poupado como passageiro: por cada km que ia de carro próprio, poupa ~120g/km
    // Carro médio emite ~0.12 kg CO2/km. Como passageiro, o carro já ia de qualquer forma.
    const passengerKm = passengerBookings
      .filter((b) => b.ride.routeDistanceKm != null)
      .reduce((sum, b) => sum + Number(b.ride.routeDistanceKm!) * b.seats, 0);

    const co2SavedKg = Math.round(passengerKm * 0.12);

    // Poupança em € como passageiro: custo de carro próprio (€0.25/km) - custo pago na boleia
    const moneySavedEur = passengerBookings.reduce((sum, b) => {
      const drivingCost = (b.ride.routeDistanceKm ?? 0) * 0.25 * b.seats;
      const paidCost = Number(b.ride.price ?? 0) * b.seats;
      return sum + Math.max(0, drivingCost - paidCost);
    }, 0);

    // Viagens como passageiro
    const totalPassengerRides = passengerBookings.length;

    // Passageiros transportados como condutor
    const totalPassengersCarried = driverRides.reduce((sum, r) => {
      return sum + r.bookings.reduce((s, b) => s + b.seats, 0);
    }, 0);

    return {
      co2SavedKg,
      moneySavedEur: Math.round(moneySavedEur * 100) / 100,
      totalPassengerRides,
      totalPassengersCarried,
    };
  }

  async findPublicProfile(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        isIdentityVerified: true,
        createdAt: true,
        profile: {
          select: {
            name: true,
            username: true,
            avatarUrl: true,
            bio: true,
          },
        },
        ratingsReceived: {
          select: { score: true, comment: true, tags: true, createdAt: true, reviewer: { select: { profile: { select: { name: true, avatarUrl: true } } } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { offeredRides: true },
        },
      },
    });

    if (!user) throw new NotFoundException('Utilizador não encontrado');

    const ratings = user.ratingsReceived;
    const avgRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((s, r) => s + r.score, 0) / ratings.length) * 10) / 10
        : null;

    // Calcular fiabilidade como condutor (últimos 30 dias)
    const since = new Date(Date.now() - 30 * 24 * 3_600_000);
    const [completedRides, cancelledRides] = await Promise.all([
      this.prisma.ride.count({ where: { driverId: id, status: 'COMPLETED', departureTime: { gte: since } } }),
      this.prisma.ride.count({ where: { driverId: id, status: 'CANCELLED', cancelledAt: { gte: since } } }),
    ]);
    const totalDriverRides = completedRides + cancelledRides;
    const reliabilityScore = totalDriverRides >= 3
      ? Math.round((completedRides / totalDriverRides) * 100)
      : null;
    const reliabilityLabel = reliabilityScore === null ? 'Novo condutor'
      : reliabilityScore >= 98 ? 'Excelente'
      : reliabilityScore >= 90 ? 'Bom'
      : reliabilityScore >= 75 ? 'Regular'
      : 'Baixo';

    return {
      id: user.id,
      isIdentityVerified: user.isIdentityVerified,
      memberSince: user.createdAt,
      profile: user.profile,
      totalRides: user._count.offeredRides,
      avgRating,
      totalRatings: ratings.length,
      reliability: {
        score: reliabilityScore,
        label: reliabilityLabel,
        totalRides: totalDriverRides,
        cancelledRides,
      },
      recentRatings: ratings.map((r) => ({
        score: r.score,
        comment: r.comment,
        tags: r.tags,
        createdAt: r.createdAt,
        reviewer: {
          name: r.reviewer?.profile?.name ?? 'Utilizador',
          avatarUrl: r.reviewer?.profile?.avatarUrl ?? null,
        },
      })),
    };
  }
}

