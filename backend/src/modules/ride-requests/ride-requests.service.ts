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
    // Auto-fechar pedidos expirados
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

  /** Usado pelo scheduler — devolve todos os pedidos OPEN não expirados */
  async findAllOpen() {
    return this.prisma.rideRequest.findMany({
      where: { status: 'OPEN', expiresAt: { gte: new Date() } },
      include: { passenger: { include: { profile: true } } },
    });
  }

  /** Para o condutor — devolve pedidos OPEN que batem com os seus templates */
  async findForDriver(driverId: string) {
    const templates = await this.prisma.scheduleTemplate.findMany({
      where: { userId: driverId, active: true },
    });
    if (templates.length === 0) return [];

    const driverDays = new Set<string>(
      templates.flatMap((t) => t.daysOfWeek as string[]),
    );

    const openRequests = await this.prisma.rideRequest.findMany({
      where: { status: 'OPEN', expiresAt: { gte: new Date() }, passengerId: { not: driverId } },
      include: { passenger: { select: { email: true, profile: { select: { name: true, avatarUrl: true } } } } },
      orderBy: { createdAt: 'desc' },
    });

    return openRequests.filter((req) => {
      const reqDays = req.daysOfWeek as string[];
      return reqDays.some((d) => driverDays.has(d));
    });
  }

}
