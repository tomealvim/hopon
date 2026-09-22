import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateRideFromTemplateDto } from './dto/create-ride-from-template.dto';
import { GeocodingService } from '../geocoding/geocoding.service';

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geocodingService: GeocodingService,
    private readonly configService: ConfigService,
  ) {}

  async create(userId: string, dto: CreateScheduleDto) {
    // Verificar se o veículo pertence ao utilizador
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, userId },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado ou não pertence ao utilizador');
    }

    // Verificar se há lugares suficientes
    if (dto.availableSeats > vehicle.seats) {
      throw new BadRequestException(
        `Número de lugares disponíveis (${dto.availableSeats}) excede os lugares do veículo (${vehicle.seats})`,
      );
    }

    // Validar formato de hora (HH:mm)
    if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(dto.time)) {
      throw new BadRequestException('Formato de hora inválido. Use HH:mm (ex: 08:00)');
    }

    const schedule = await this.prisma.scheduleTemplate.create({
      data: {
        userId,
        vehicleId: dto.vehicleId,
        origin: dto.origin,
        destination: dto.destination,
        time: dto.time,
        daysOfWeek: dto.daysOfWeek,
        availableSeats: dto.availableSeats,
        priceCents: dto.priceCents ?? null,
        acceptDetours: dto.acceptDetours ?? true,
        detourMaxMin: dto.detourMaxMin ?? 10,
        meetingPoint: dto.meetingPoint ?? null,
        notes: dto.notes ?? null,
        preferences: dto.preferences ?? null,
        active: true,
      },
      include: {
        vehicle: true,
      },
    });

    return this.toResponse(schedule);
  }

  async findAll(userId: string) {
    const schedules = await this.prisma.scheduleTemplate.findMany({
      where: { userId },
      include: {
        vehicle: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return schedules.map((s) => this.toResponse(s));
  }

  async findOne(userId: string, scheduleId: string) {
    const schedule = await this.prisma.scheduleTemplate.findFirst({
      where: { id: scheduleId, userId },
      include: {
        vehicle: true,
      },
    });

    if (!schedule) {
      throw new NotFoundException('Template de horário não encontrado');
    }

    return this.toResponse(schedule);
  }

  async update(userId: string, scheduleId: string, dto: UpdateScheduleDto) {
    await this.findOne(userId, scheduleId); // Verifica existência e ownership

    const updateData: any = {};
    if (dto.origin !== undefined) updateData.origin = dto.origin;
    if (dto.destination !== undefined) updateData.destination = dto.destination;
    if (dto.time !== undefined) {
      if (!/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(dto.time)) {
        throw new BadRequestException('Formato de hora inválido. Use HH:mm (ex: 08:00)');
      }
      updateData.time = dto.time;
    }
    if (dto.daysOfWeek !== undefined) updateData.daysOfWeek = dto.daysOfWeek;
    if (dto.availableSeats !== undefined) updateData.availableSeats = dto.availableSeats;
    if (dto.priceCents !== undefined) updateData.priceCents = dto.priceCents;
    if (dto.active !== undefined) updateData.active = dto.active;
    if (dto.acceptDetours !== undefined) updateData.acceptDetours = dto.acceptDetours;
    if (dto.detourMaxMin !== undefined) updateData.detourMaxMin = dto.detourMaxMin;
    if (dto.meetingPoint !== undefined) updateData.meetingPoint = dto.meetingPoint;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.preferences !== undefined) updateData.preferences = dto.preferences ?? null;

    // Se estiver a atualizar lugares, verificar veículo
    if (dto.availableSeats !== undefined) {
      const schedule = await this.prisma.scheduleTemplate.findUnique({
        where: { id: scheduleId },
        include: { vehicle: true },
      });
      if (schedule && dto.availableSeats > schedule.vehicle.seats) {
        throw new BadRequestException(
          `Número de lugares disponíveis (${dto.availableSeats}) excede os lugares do veículo (${schedule.vehicle.seats})`,
        );
      }
    }

    const updated = await this.prisma.scheduleTemplate.update({
      where: { id: scheduleId },
      data: updateData,
      include: {
        vehicle: true,
      },
    });

    return this.toResponse(updated);
  }

  async remove(userId: string, scheduleId: string) {
    await this.findOne(userId, scheduleId); // Verifica existência e ownership

    await this.prisma.scheduleTemplate.delete({
      where: { id: scheduleId },
    });

    return { message: 'Template de horário eliminado com sucesso' };
  }

  async createRideFromTemplate(userId: string, templateId: string, dto: CreateRideFromTemplateDto) {
    const template = await this.findOne(userId, templateId);

    if (!template.active) {
      throw new BadRequestException('Não é possível criar boleia a partir de um template inativo');
    }

    const departureDate = new Date(dto.departureTime);
    const dayOfWeek = this.getDayOfWeek(departureDate);
    const templateDays = template.daysOfWeek as string[];

    if (!templateDays.includes(dayOfWeek)) {
      throw new BadRequestException(
        `A data ${departureDate.toLocaleDateString('pt-PT')} não corresponde a nenhum dos dias do template (${templateDays.join(', ')})`,
      );
    }

    // Combinar data do departureTime com hora do template
    const [hours, minutes] = template.time.split(':');
    departureDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    // Verificar se o veículo ainda pertence ao utilizador
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: template.vehicleId, userId },
    });

    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado ou não pertence ao utilizador');
    }

    const availableSeats = dto.availableSeats ?? template.availableSeats;
    if (availableSeats > vehicle.seats) {
      throw new BadRequestException(
        `Número de lugares disponíveis (${availableSeats}) excede os lugares do veículo (${vehicle.seats})`,
      );
    }

    // Geocodificar origem e destino do template para criar Location records
    const [originCoords, destCoords] = await Promise.all([
      this.geocodingService.geocodeText(template.origin),
      this.geocodingService.geocodeText(template.destination),
    ]);

    let originLocationId: string | null = null;
    let destinationLocationId: string | null = null;

    if (originCoords) {
      const loc = await this.prisma.location.create({
        data: { label: template.origin, lat: originCoords.lat, lng: originCoords.lng },
      });
      originLocationId = loc.id;
    }

    if (destCoords) {
      const loc = await this.prisma.location.create({
        data: { label: template.destination, lat: destCoords.lat, lng: destCoords.lng },
      });
      destinationLocationId = loc.id;
    }

    const ride = await this.prisma.ride.create({
      data: {
        driverId: userId,
        vehicleId: template.vehicleId,
        origin: template.origin,
        destination: template.destination,
        departureTime: departureDate,
        availableSeats,
        priceCents: dto.priceCents ?? template.priceCents ?? null,
        status: 'SCHEDULED',
        scheduleTemplateId: templateId,
        ...(originLocationId && { originLocationId }),
        ...(destinationLocationId && { destinationLocationId }),
      },
    });

    return ride;
  }

  private getDayOfWeek(date: Date): string {
    const days = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    return days[date.getDay()];
  }

  private toResponse(schedule: any) {
    const daysOfWeek = (schedule.daysOfWeek as string[]) ?? [];
    const preferences = (schedule.preferences as Record<string, boolean>) ?? null;

    return {
      id: schedule.id,
      userId: schedule.userId,
      vehicleId: schedule.vehicleId,
      origin: schedule.origin,
      destination: schedule.destination,
      time: schedule.time,
      daysOfWeek,
      availableSeats: schedule.availableSeats,
      priceCents: schedule.priceCents,
      acceptDetours: schedule.acceptDetours ?? true,
      detourMaxMin: schedule.detourMaxMin ?? 10,
      meetingPoint: schedule.meetingPoint ?? null,
      notes: schedule.notes ?? null,
      preferences,
      active: schedule.active,
      vehicle: schedule.vehicle
        ? {
            id: schedule.vehicle.id,
            brand: schedule.vehicle.brand,
            model: schedule.vehicle.model,
            color: schedule.vehicle.color,
            imageUrl: schedule.vehicle.imageUrl,
            seats: schedule.vehicle.seats,
          }
        : null,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    };
  }

  async scanImage(imageDataUrl: string): Promise<{ text: string }> {
    const apiKey = this.configService.get<string>('GOOGLE_VISION_API_KEY');
    if (!apiKey) throw new BadRequestException('GOOGLE_VISION_API_KEY não configurada');

    const base64Image = imageDataUrl.split(',')[1];
    if (!base64Image) throw new BadRequestException('Imagem inválida');

    const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image },
          features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
        }],
      }),
    });

    if (!response.ok) throw new BadRequestException('Erro na Google Vision API');

    const data = await response.json();
    const text = data.responses?.[0]?.textAnnotations?.[0]?.description;
    if (!text) throw new BadRequestException('Nenhum texto encontrado na imagem');

    return { text };
  }
}
