import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { CreateRideRequestDto } from './dto/create-ride-request.dto';

@Injectable()
export class RideRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geocodingService: GeocodingService,
  ) {}

  async create(passengerId: string, dto: CreateRideRequestDto) {
    let originLat = dto.originLat ?? null;
    let originLng = dto.originLng ?? null;
    let destinationLat = dto.destinationLat ?? null;
    let destinationLng = dto.destinationLng ?? null;

    if (originLat == null || originLng == null) {
      const coords = await this.geocodingService.geocodeText(dto.origin);
      if (coords) { originLat = coords.lat; originLng = coords.lng; }
    }
    if (destinationLat == null || destinationLng == null) {
      const coords = await this.geocodingService.geocodeText(dto.destination);
      if (coords) { destinationLat = coords.lat; destinationLng = coords.lng; }
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    return this.prisma.rideRequest.create({
      data: {
        passengerId,
        origin: dto.origin,
        originLat,
        originLng,
        destination: dto.destination,
        destinationLat,
        destinationLng,
        departTime: dto.departTime,
        daysOfWeek: dto.daysOfWeek,
        note: dto.note ?? null,
        expiresAt,
      },
    });
  }

  async findAll(passengerId: string) {
    await this.prisma.rideRequest.updateMany({
      where: { passengerId, status: 'OPEN', expiresAt: { lt: new Date() } },
      data: { status: 'CLOSED' },
    });

    return this.prisma.rideRequest.findMany({
      where: { passengerId, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async close(passengerId: string, id: string) {
    const req = await this.prisma.rideRequest.findFirst({ where: { id, passengerId } });
    if (!req) throw new NotFoundException('Pedido não encontrado');
    await this.prisma.rideRequest.update({ where: { id }, data: { status: 'CLOSED' } });
    return { ok: true };
  }

  /** Usado pelo scheduler */
  async findAllOpen() {
    return this.prisma.rideRequest.findMany({
      where: { status: 'OPEN', expiresAt: { gte: new Date() } },
      include: { passenger: { include: { profile: true } } },
    });
  }

  /**
   * Para o condutor — devolve pedidos OPEN ordenados por:
   * 1. Proximidade da origem do pedido à posição atual do condutor (se driverLat/Lng fornecidos)
   * 2. Sobreposição de destino (se driverDestLat/Lng fornecidos)
   * 3. Compatibilidade de dias com os templates do condutor
   */
  async findForDriver(
    driverId: string,
    driverLat?: number,
    driverLng?: number,
    driverDestLat?: number,
    driverDestLng?: number,
  ) {
    const templates = await this.prisma.scheduleTemplate.findMany({
      where: { userId: driverId, active: true },
    });

    const driverDays = new Set<string>(
      templates.flatMap((t) => t.daysOfWeek as string[]),
    );

    const openRequests = await this.prisma.rideRequest.findMany({
      where: { status: 'OPEN', expiresAt: { gte: new Date() }, passengerId: { not: driverId } },
      include: { passenger: { select: { email: true, profile: { select: { name: true, avatarUrl: true } } } } },
    });

    // Calcular score de cada pedido
    const scored = openRequests.map((req) => {
      const reqDays = req.daysOfWeek as string[];
      const dayMatch = reqDays.some((d) => driverDays.has(d));

      // Distância entre posição atual do condutor e origem do pedido
      let originDistKm: number | null = null;
      if (driverLat != null && driverLng != null && req.originLat != null && req.originLng != null) {
        originDistKm = this.haversineKm(driverLat, driverLng, req.originLat, req.originLng);
      }

      // Distância entre destino do condutor e destino do pedido
      let destDistKm: number | null = null;
      if (driverDestLat != null && driverDestLng != null && req.destinationLat != null && req.destinationLng != null) {
        destDistKm = this.haversineKm(driverDestLat, driverDestLng, req.destinationLat, req.destinationLng);
      }

      // Score: quanto mais baixo melhor (km). Sem GPS usa 999 para não excluir mas colocar no fim
      const originScore = originDistKm ?? 999;
      const destScore = destDistKm ?? 999;
      // Pedidos sem overlap de dias vão para o fim
      const dayScore = dayMatch ? 0 : 10000;

      return { req, originDistKm, destDistKm, dayMatch, sortKey: dayScore + originScore * 0.7 + destScore * 0.3 };
    });

    // Ordenar por sortKey (menor = mais relevante)
    scored.sort((a, b) => a.sortKey - b.sortKey);

    return scored.map(({ req, originDistKm, destDistKm, dayMatch }) => ({
      id: req.id,
      origin: req.origin,
      destination: req.destination,
      departTime: req.departTime,
      daysOfWeek: req.daysOfWeek,
      note: req.note,
      originLat: req.originLat,
      originLng: req.originLng,
      destinationLat: req.destinationLat,
      destinationLng: req.destinationLng,
      createdAt: req.createdAt,
      passenger: req.passenger,
      originDistKm: originDistKm != null ? Math.round(originDistKm * 10) / 10 : null,
      destDistKm: destDistKm != null ? Math.round(destDistKm * 10) / 10 : null,
      dayMatch,
    }));
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
}
