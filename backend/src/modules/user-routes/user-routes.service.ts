import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { CreateUserRouteDto } from './dto/create-user-route.dto';

@Injectable()
export class UserRoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geocodingService: GeocodingService,
  ) {}

  async create(userId: string, dto: CreateUserRouteDto) {
    let originLat = dto.originLat ?? null;
    let originLng = dto.originLng ?? null;

    if (originLat == null || originLng == null) {
      const coords = await this.geocodingService.geocodeText(dto.origin);
      if (coords) {
        originLat = coords.lat;
        originLng = coords.lng;
      }
    }

    return this.prisma.userRoute.create({
      data: {
        userId,
        origin: dto.origin,
        originLat,
        originLng,
        destination: dto.destination,
        departTime: dto.departTime,
        daysOfWeek: dto.daysOfWeek,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.userRoute.findMany({
      where: { userId, active: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async remove(userId: string, id: string) {
    const route = await this.prisma.userRoute.findFirst({ where: { id, userId } });
    if (!route) throw new NotFoundException('Rota não encontrada');
    await this.prisma.userRoute.delete({ where: { id } });
    return { ok: true };
  }
}
