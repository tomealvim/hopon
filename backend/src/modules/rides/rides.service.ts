import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { UpdateRideDto } from './dto/update-ride.dto';
import { SearchRidesDto } from './dto/search-rides.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { WalletService } from '../wallet/wallet.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { CommunitiesService } from '../communities/communities.service';
import { InboxService } from '../inbox/inbox.service';

const SEARCH_TTL_MS = 30_000;  // 30s
const FOR_YOU_TTL_MS = 60_000; // 60s

@Injectable()
export class RidesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly walletService: WalletService,
    private readonly geocodingService: GeocodingService,
    private readonly communitiesService: CommunitiesService,
    private readonly inboxService: InboxService,
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

    // Criar registos de Location com coordenadas (frontend ou geocoding como fallback)
    let originLocationId: string | null = null;
    let destinationLocationId: string | null = null;

    const originCoords = (dto.originLat != null && dto.originLng != null)
      ? { lat: dto.originLat, lng: dto.originLng }
      : await this.geocodingService.geocodeText(dto.origin);

    if (originCoords) {
      const loc = await this.prisma.location.create({
        data: { label: dto.origin, lat: originCoords.lat, lng: originCoords.lng, city: dto.city ?? null },
      });
      originLocationId = loc.id;
    }

    const destCoords = (dto.destinationLat != null && dto.destinationLng != null)
      ? { lat: dto.destinationLat, lng: dto.destinationLng }
      : await this.geocodingService.geocodeText(dto.destination);

    if (destCoords) {
      const loc = await this.prisma.location.create({
        data: { label: dto.destination, lat: destCoords.lat, lng: destCoords.lng },
      });
      destinationLocationId = loc.id;
    }

    // Buscar polilinha da rota (uma vez, guardada na DB para matching futuro)
    let routePolyline: { lat: number; lng: number }[] | null = null;
    if (originCoords && destCoords) {
      routePolyline = await this.geocodingService.getRoutePolyline(
        originCoords.lat, originCoords.lng,
        destCoords.lat, destCoords.lng,
      );
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
        ...(routePolyline && { routePolyline }),
        instantBooking: dto.instantBooking ?? false,
        ...(dto.meetingPoint && { meetingPoint: dto.meetingPoint }),
        ...(dto.communityId && { communityId: dto.communityId }),
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
        community: true,
      },
    });

    // Criar conversa de grupo para esta boleia (condutor é o primeiro participante)
    void this.inboxService.getOrCreateRideGroupConversation(ride.id, userId);

    // Invalidar cache de pesquisa para resultados imediatos
    void this.cache.clear();

    // 16.2.3 — Se a boleia parte nas próximas 2h, notificar utilizadores próximos com rota compatível
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    if (originCoords && ride.departureTime <= twoHoursLater) {
      void this.notifyNearbyUsersForNow(userId, ride.id, originCoords.lat, originCoords.lng, ride.origin, ride.destination);
    }

    // 16.4.5 — Notificar autores de ride requests compatíveis com esta boleia
    void this.notifyMatchingRideRequests(userId, ride.id, ride.origin, ride.destination, originCoords, destCoords);

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

    // Obter templates, rotas habituais, condutores familiares e mapa de comunidades partilhadas
    const [templates, userRoutes, pastBookings, sharedCommunityMap] = await Promise.all([
      this.prisma.scheduleTemplate.findMany({ where: { userId, active: true } }),
      this.prisma.userRoute.findMany({ where: { userId, active: true } }),
      this.prisma.booking.findMany({
        where: { userId, status: 'CONFIRMED' },
        include: { ride: { select: { driverId: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.communitiesService.getSharedCommunityMap(userId),
    ]);

    // IDs de condutores com quem o user já viajou
    const familiarDriverIds = new Set(pastBookings.map((b) => b.ride.driverId));

    // Normalizar ambos para o mesmo formato de "padrão"
    type Pattern = {
      origin: string;
      originLat?: number | null;
      originLng?: number | null;
      destination: string;
      destinationLat?: number | null;
      destinationLng?: number | null;
      departTime: string;
      daysOfWeek: string[];
    };
    const patterns: Pattern[] = [
      ...templates.map((t) => ({
        origin: t.origin,
        destination: t.destination,
        departTime: t.time,
        daysOfWeek: t.daysOfWeek as string[],
      })),
      ...userRoutes.map((r) => ({
        origin: r.origin,
        originLat: r.originLat,
        originLng: r.originLng,
        destination: r.destination,
        destinationLat: r.destinationLat ?? null,
        destinationLng: r.destinationLng ?? null,
        departTime: r.departTime,
        daysOfWeek: r.daysOfWeek as string[],
      })),
    ];

    // Boleias futuras SCHEDULED que não são do próprio utilizador (até 7 dias)
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const myCommunityIds = await this.prisma.communityMember.findMany({
      where: { userId, status: 'APPROVED' },
      select: { communityId: true },
    }).then((ms) => ms.map((m) => m.communityId));

    const rides = await this.prisma.ride.findMany({
      where: {
        status: 'SCHEDULED',
        driverId: { not: userId },
        departureTime: { gte: now, lte: in7Days },
        // Excluir boleias privadas de comunidades das quais o user não é membro
        OR: [
          { communityId: null },
          { communityId: { in: myCommunityIds } },
        ],
      },
      include: {
        vehicle: { include: { user: { include: { profile: true } } } },
        driver: { include: { profile: true } },
        bookings: true,
        originLocation: true,
        destinationLocation: true,
        community: true,
      },
    });

    if (patterns.length === 0 && familiarDriverIds.size === 0) {
      await this.cache.set(cacheKey, [], FOR_YOU_TTL_MS);
      return [];
    }

    const DAY_NAMES = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

    // matchScore e overlapPct acumulam por cada padrão que faz match com a ride
    const scores = new Map<string, { ride: (typeof rides)[0]; score: number; overlapPct: number; familiar: boolean }>();

    // Pré-popular com condutores familiares (score base = 5)
    for (const ride of rides) {
      if (familiarDriverIds.has(ride.driverId)) {
        const booked = ride.bookings
          .filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING')
          .reduce((s, b) => s + b.seats, 0);
        if (ride.availableSeats - booked > 0) {
          scores.set(ride.id, { ride, score: 5, overlapPct: 0, familiar: true });
        }
      }
    }

    for (const pattern of patterns) {
      const [ph, pm] = pattern.departTime.split(':').map(Number);
      const patternMin = ph * 60 + pm;

      for (const ride of rides) {
        // Dia da semana
        const rideDay = DAY_NAMES[ride.departureTime.getDay()];
        if (!pattern.daysOfWeek.includes(rideDay)) continue;

        // Hora ±30 min
        const rideMin = ride.departureTime.getHours() * 60 + ride.departureTime.getMinutes();
        const timeDiff = Math.abs(rideMin - patternMin);
        if (timeDiff > 30) continue;

        // Lugares disponíveis
        const booked = ride.bookings
          .filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING')
          .reduce((s, b) => s + b.seats, 0);
        if (ride.availableSeats - booked <= 0) continue;

        // Polilinha do condutor (JSON armazenado)
        const polyline = ride.routePolyline
          ? (ride.routePolyline as unknown as { lat: number; lng: number }[])
          : null;

        const patternHasOriginCoords = pattern.originLat != null && pattern.originLng != null;
        const patternHasDestCoords = pattern.destinationLat != null && pattern.destinationLng != null;

        // Origem — corredor se polilinha disponível, senão GPS 5km, senão text overlap
        if (polyline && polyline.length > 0 && patternHasOriginCoords) {
          const distOrigin = this.minDistToPolylineM(
            pattern.originLat!, pattern.originLng!, polyline,
          );
          if (distOrigin > 2000) continue; // fora de corredor de 2km
        } else {
          const rideHasOriginCoords = ride.originLocation?.lat != null && ride.originLocation?.lng != null;
          if (rideHasOriginCoords && patternHasOriginCoords) {
            const distKm = this.haversineKm(
              ride.originLocation!.lat!, ride.originLocation!.lng!,
              pattern.originLat!, pattern.originLng!,
            );
            if (distKm > 5) continue;
          } else {
            if (!this.textOverlap(ride.origin, pattern.origin)) continue;
          }
        }

        // Destino — corredor se polilinha + coords disponíveis, senão text overlap
        if (polyline && polyline.length > 0 && patternHasDestCoords) {
          const distDest = this.minDistToPolylineM(
            pattern.destinationLat!, pattern.destinationLng!, polyline,
          );
          if (distDest > 2000) continue;
        } else {
          if (!this.textOverlap(ride.destination, pattern.destination)) continue;
        }

        // Calcular overlapPct se temos coords de origem e destino do passageiro
        let overlapPct = 0;
        if (polyline && polyline.length > 0 && patternHasOriginCoords && patternHasDestCoords) {
          overlapPct = this.calcOverlapPct(
            pattern.originLat!, pattern.originLng!,
            pattern.destinationLat!, pattern.destinationLng!,
            polyline,
          );
        }

        // Score: tempo + overlap + bónus condutor familiar
        const timeScore = 30 - timeDiff;
        const overlapBonus = Math.round(overlapPct * 0.7); // até 70 pontos extra por 100% overlap
        const familiarBonus = familiarDriverIds.has(ride.driverId) ? 20 : 0;
        const prev = scores.get(ride.id);
        if (prev) {
          prev.score += timeScore + overlapBonus + 10;
          if (overlapPct > prev.overlapPct) prev.overlapPct = overlapPct;
          prev.familiar = prev.familiar || familiarDriverIds.has(ride.driverId);
        } else {
          scores.set(ride.id, { ride, score: timeScore + overlapBonus + familiarBonus, overlapPct, familiar: familiarDriverIds.has(ride.driverId) });
        }
      }
    }

    const result = Array.from(scores.values())
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.ride.departureTime.getTime() - b.ride.departureTime.getTime(),
      )
      .map(({ ride, score, overlapPct, familiar }) => {
        const dep = ride.departureTime;
        const isTomorrow = dep >= tomorrow && dep <= tomorrowEnd;
        const section: 'tomorrow' | 'familiar' | 'this_week' =
          isTomorrow ? 'tomorrow' : familiar ? 'familiar' : 'this_week';
        const sharedCommunity = sharedCommunityMap.get(ride.driverId) ?? null;
        return {
          ...this.toResponse(ride),
          matchScore: score,
          section,
          sharedCommunity,
          ...(overlapPct > 0 ? { overlapPct: Math.round(overlapPct) } : {}),
        };
      });
    await this.cache.set(cacheKey, result, FOR_YOU_TTL_MS);
    return result;
  }

  /**
   * Distância mínima (metros) de um ponto a uma polilinha (segmentos consecutivos).
   */
  private minDistToPolylineM(
    lat: number, lng: number,
    polyline: { lat: number; lng: number }[],
  ): number {
    if (polyline.length === 0) return Infinity;
    if (polyline.length === 1) return this.haversineM(lat, lng, polyline[0].lat, polyline[0].lng);
    let minDist = Infinity;
    for (let i = 0; i < polyline.length - 1; i++) {
      const d = this.pointToSegmentM(lat, lng, polyline[i].lat, polyline[i].lng, polyline[i + 1].lat, polyline[i + 1].lng);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  /**
   * Distância ponto-a-segmento em metros (projeção perpendicular).
   */
  private pointToSegmentM(pLat: number, pLng: number, aLat: number, aLng: number, bLat: number, bLng: number): number {
    const dx = bLat - aLat;
    const dy = bLng - aLng;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return this.haversineM(pLat, pLng, aLat, aLng);
    const t = Math.max(0, Math.min(1, ((pLat - aLat) * dx + (pLng - aLng) * dy) / lenSq));
    return this.haversineM(pLat, pLng, aLat + t * dx, aLng + t * dy);
  }

  /**
   * Score de sobreposição em % (0–100):
   * Amostra 20 pontos ao longo da rota do passageiro (interpolação linear)
   * e verifica quantos ficam a ≤500m da polilinha do condutor.
   */
  private calcOverlapPct(
    originLat: number, originLng: number,
    destLat: number, destLng: number,
    polyline: { lat: number; lng: number }[],
  ): number {
    const SAMPLES = 20;
    const THRESHOLD_M = 500;
    let inside = 0;
    for (let i = 0; i < SAMPLES; i++) {
      const t = i / (SAMPLES - 1);
      const sLat = originLat + t * (destLat - originLat);
      const sLng = originLng + t * (destLng - originLng);
      if (this.minDistToPolylineM(sLat, sLng, polyline) <= THRESHOLD_M) inside++;
    }
    return (inside / SAMPLES) * 100;
  }

  private haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
    return this.haversineKm(lat1, lng1, lat2, lng2) * 1000;
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

  async findAvailableNow() {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const rides = await this.prisma.ride.findMany({
      where: {
        status: 'SCHEDULED',
        departureTime: { gte: now, lte: twoHoursLater },
      },
      include: {
        vehicle: true,
        driver: { include: { profile: true } },
        bookings: true,
        originLocation: true,
        destinationLocation: true,
      },
      orderBy: { departureTime: 'asc' },
    });

    return rides
      .filter((r) => {
        const booked = r.bookings
          .filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING')
          .reduce((sum, b) => sum + b.seats, 0);
        return booked < r.availableSeats;
      })
      .map((r) => this.toResponse(r));
  }

  async search(dto: SearchRidesDto, userId: string | null = null) {
    const cacheKey = `rides:search:${userId ?? 'anon'}:${JSON.stringify(
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

    // Filtro de comunidade: só boleias de condutores aprovados nessa comunidade
    if (dto.communityId) {
      const members = await this.prisma.communityMember.findMany({
        where: { communityId: dto.communityId, status: 'APPROVED' },
        select: { userId: true },
      });
      where.driverId = { in: members.map((m) => m.userId) };
    }

    // Filtrar boleias privadas: só mostrar se o user é membro da comunidade
    if (userId) {
      const myCommunityIds = await this.prisma.communityMember.findMany({
        where: { userId, status: 'APPROVED' },
        select: { communityId: true },
      }).then((ms) => ms.map((m) => m.communityId));
      const orPrivacy = [{ communityId: null }, ...(myCommunityIds.length > 0 ? [{ communityId: { in: myCommunityIds } }] : [])];
      where.OR = where.OR ? [...(where.OR as any[]), ...orPrivacy] : orPrivacy;
    } else {
      // Utilizador não autenticado — só vê boleias públicas
      where.communityId = null;
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
        community: true,
      },
      orderBy: { departureTime: 'asc' },
    });

    // Badge de comunidade partilhada (só se autenticado)
    const sharedCommunityMap = userId
      ? await this.communitiesService.getSharedCommunityMap(userId)
      : new Map<string, { id: string; name: string }>();

    const result = rides.map((ride) => ({
      ...this.toResponse(ride),
      sharedCommunity: sharedCommunityMap.get(ride.driverId) ?? null,
    }));
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

  async onTheWay(driverId: string, rideId: string) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { bookings: true },
    });

    if (!ride) throw new NotFoundException('Boleia não encontrada');
    if (ride.driverId !== driverId) throw new ForbiddenException('Não tens permissão para gerir esta boleia');
    if (ride.status !== 'SCHEDULED') throw new BadRequestException('A boleia não está em estado SCHEDULED');
    if (ride.onTheWayAt) throw new BadRequestException('Já anunciaste que estás a caminho para esta boleia');

    const minsUntil = (ride.departureTime.getTime() - Date.now()) / 60_000;
    if (minsUntil > 120) throw new BadRequestException('Só podes anunciar "a caminho" até 2 horas antes da partida');

    await this.prisma.ride.update({
      where: { id: rideId },
      data: { onTheWayAt: new Date() },
    });

    const confirmedPassengerIds = ride.bookings
      .filter((b) => b.status === 'CONFIRMED')
      .map((b) => b.userId);

    if (confirmedPassengerIds.length > 0) {
      void this.notificationsService.notifyDriverOnTheWay(
        rideId,
        ride.origin,
        ride.destination,
        ride.departureTime,
        confirmedPassengerIds,
      );
    }

    return { message: 'Passageiros notificados que estás a caminho.' };
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
          const amount = (Number(ride.price) + Number(ride.platformFee ?? 0)) * booking.seats;
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

    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { bookings: true },
    });

    if (!ride) throw new NotFoundException('Boleia não encontrada');

    const confirmedBookings = ride.bookings.filter((b) => b.status === 'CONFIRMED');
    const pendingBookings   = ride.bookings.filter((b) => b.status === 'PENDING');
    const affectedUserIds   = [...new Set(ride.bookings.map((b) => b.userId))];

    const now = new Date();
    const minsUntil = (ride.departureTime.getTime() - now.getTime()) / 60_000;
    const isLateCancel = minsUntil < 120; // cancelamento de última hora: <2h antes

    // Soft-delete: marcar ride como CANCELLED
    await this.prisma.ride.update({
      where: { id: rideId },
      data: { status: 'CANCELLED', cancelledAt: now },
    });

    // Marcar todas as reservas como CANCELLED
    await this.prisma.booking.updateMany({
      where: { rideId, status: { in: ['PENDING', 'CONFIRMED'] } },
      data: { status: 'CANCELLED' },
    });

    // Reembolsar reservas pagas (PENDING e CONFIRMED)
    const bookingsToRefund = [...pendingBookings, ...confirmedBookings];
    if (ride.price != null && Number(ride.price) > 0) {
      for (const booking of bookingsToRefund) {
        try {
          await this.walletService.refund(
            booking.userId,
            (Number(ride.price) + Number(ride.platformFee ?? 0)) * booking.seats,
            'Boleia cancelada pelo condutor',
            booking.id,
          );
        } catch (err) {
          console.error(`[RidesService] Erro ao reembolsar booking ${booking.id}:`, err);
        }
      }
    }

    // Notificar utilizadores afetados (confirmados recebem push urgente, pendentes recebem in-app normal)
    const confirmedUserIds = confirmedBookings.map((b) => b.userId);
    const pendingUserIds   = pendingBookings.map((b) => b.userId);
    if (affectedUserIds.length > 0) {
      try {
        await this.notificationsService.notifyRideCancelled(
          rideId,
          ride.origin,
          ride.destination,
          ride.departureTime,
          confirmedUserIds,
          pendingUserIds,
        );
      } catch (error) {
        console.error('Erro ao enviar notificações de cancelamento:', error);
      }
    }

    // Rastrear cancelamentos de última hora e auto-suspender se necessário
    if (isLateCancel) {
      const driver = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { lateCancelCount: true, lateCancelWindowStart: true },
      });

      if (driver) {
        const windowStart = driver.lateCancelWindowStart;
        const windowExpired = !windowStart || (now.getTime() - windowStart.getTime()) > 30 * 24 * 3_600_000;

        const newCount = windowExpired ? 1 : driver.lateCancelCount + 1;
        const newWindowStart = windowExpired ? now : windowStart;

        await this.prisma.user.update({
          where: { id: userId },
          data: {
            lateCancelCount: newCount,
            lateCancelWindowStart: newWindowStart,
            // Auto-suspender ao 3.º cancelamento de última hora em 30 dias
            ...(newCount >= 3 && {
              suspendedAt: now,
              suspensionReason: `Suspensão automática: ${newCount} cancelamentos de última hora (<2h) em 30 dias`,
            }),
          },
        });

        if (newCount >= 3) {
          console.warn(`[RidesService] Utilizador ${userId} auto-suspenso após ${newCount} cancelamentos de última hora`);
        }
      }
    }

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
    const passengerBookingMap = new Map(
      asPassenger.map((b) => [b.rideId, b.id]),
    );
    const passengerRides = asPassenger
      .filter((b) => !driverRideIds.has(b.rideId))
      .map((b) => b.ride);

    const allRides = [...asDriver, ...passengerRides].sort(
      (a, b) => new Date(b.departureTime).getTime() - new Date(a.departureTime).getTime(),
    );

    return allRides.map((ride) => ({
      ...this.toResponse(ride),
      role: ride.driverId === userId ? 'driver' : 'passenger',
      myBookingId: passengerBookingMap.get(ride.id) ?? null,
    }));
  }

  async getReliabilityScore(userId: string): Promise<{ score: number | null; totalRides: number; cancelledRides: number; label: string }> {
    const since = new Date(Date.now() - 30 * 24 * 3_600_000);
    const [completed, cancelled] = await Promise.all([
      this.prisma.ride.count({ where: { driverId: userId, status: 'COMPLETED', departureTime: { gte: since } } }),
      this.prisma.ride.count({ where: { driverId: userId, status: 'CANCELLED', cancelledAt: { gte: since } } }),
    ]);
    const total = completed + cancelled;
    if (total < 3) return { score: null, totalRides: total, cancelledRides: cancelled, label: 'Novo condutor' };
    const score = Math.round((completed / total) * 100);
    const label = score >= 98 ? 'Excelente' : score >= 90 ? 'Bom' : score >= 75 ? 'Regular' : 'Baixo';
    return { score, totalRides: total, cancelledRides: cancelled, label };
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
      routePolyline: ride.routePolyline ?? null,
      instantBooking: ride.instantBooking ?? false,
      meetingPoint: ride.meetingPoint ?? null,
      communityId: ride.communityId ?? null,
      community: ride.community ? { id: ride.community.id, name: ride.community.name } : null,
      scheduleTemplateId: ride.scheduleTemplateId ?? null,
      status: ride.status,
      arrivedAt: ride.arrivedAt ?? null,
      onTheWayAt: ride.onTheWayAt ?? null,
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

  /** 16.2.3 — Notificar utilizadores próximos quando uma boleia "agora" é criada */
  private async notifyNearbyUsersForNow(
    driverId: string,
    rideId: string,
    originLat: number,
    originLng: number,
    origin: string,
    destination: string,
  ) {
    const RADIUS_DEG = 0.027; // ~3 km
    const LOCATION_STALE_MS = 30 * 60 * 1000; // 30 min
    const staleCutoff = new Date(Date.now() - LOCATION_STALE_MS);

    const nearbyUsers = await this.prisma.user.findMany({
      where: {
        id: { not: driverId },
        currentLat: { gte: originLat - RADIUS_DEG, lte: originLat + RADIUS_DEG },
        currentLng: { gte: originLng - RADIUS_DEG, lte: originLng + RADIUS_DEG },
        locationUpdatedAt: { gte: staleCutoff },
      },
      select: { id: true },
    });

    for (const user of nearbyUsers) {
      void this.notificationsService.createNotification(
        user.id,
        'ride.available-now',
        'Boleia disponivel agora perto de ti',
        `Ha uma boleia disponivel agora de ${origin} para ${destination}. Queres pedir lugar?`,
        { rideId },
      );
    }
  }

  /** 16.4.5 — Notificar autores de ride requests que batem com a boleia criada */
  private async notifyMatchingRideRequests(
    driverId: string,
    rideId: string,
    rideOrigin: string,
    rideDestination: string,
    originCoords: { lat: number; lng: number } | null,
    destCoords: { lat: number; lng: number } | null,
  ) {
    const ORIGIN_RADIUS_KM = 5;   // origem do request até à origem da boleia
    const DEST_RADIUS_KM = 8;     // destino do request até ao destino da boleia

    const openRequests = await this.prisma.rideRequest.findMany({
      where: { status: 'OPEN', expiresAt: { gte: new Date() }, passengerId: { not: driverId } },
      include: { passenger: { select: { id: true } } },
    });

    for (const req of openRequests) {
      // Verificar proximidade de origem (se coords disponíveis)
      if (originCoords && req.originLat != null && req.originLng != null) {
        const distKm = this.haversineKm(originCoords.lat, originCoords.lng, req.originLat, req.originLng);
        if (distKm > ORIGIN_RADIUS_KM) continue;
      }

      // Verificar proximidade de destino (se coords disponíveis)
      if (destCoords && req.destinationLat != null && req.destinationLng != null) {
        const distKm = this.haversineKm(destCoords.lat, destCoords.lng, req.destinationLat, req.destinationLng);
        if (distKm > DEST_RADIUS_KM) continue;
      }

      void this.notificationsService.createNotification(
        req.passenger.id,
        'ride-request.matched',
        'Boleia compativel com o teu pedido',
        `Uma nova boleia de ${rideOrigin} para ${rideDestination} pode corresponder ao teu pedido. Ve os detalhes!`,
        { rideId, rideRequestId: req.id },
      );
    }
  }

}

