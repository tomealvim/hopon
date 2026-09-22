import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRecurringBookingDto } from './dto/create-recurring-booking.dto';

@Injectable()
export class RecurringBookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateRecurringBookingDto) {
    // Verificar que o template existe e está ativo
    const template = await this.prisma.scheduleTemplate.findUnique({
      where: { id: dto.scheduleTemplateId },
      include: { user: { include: { profile: true } } },
    });

    if (!template || !template.active) {
      throw new NotFoundException('Template de boleia não encontrado ou inativo');
    }

    if (template.userId === userId) {
      throw new ForbiddenException('Não podes subscrever a tua própria boleia recorrente');
    }

    // Verificar duplicado
    const existing = await this.prisma.recurringBooking.findUnique({
      where: { passengerId_scheduleTemplateId: { passengerId: userId, scheduleTemplateId: dto.scheduleTemplateId } },
    });

    if (existing) {
      if (existing.status === 'ACTIVE') {
        throw new ConflictException('Já tens uma subscrição ativa para esta boleia recorrente');
      }
      // Reativar se estava cancelada/pausada
      return this.prisma.recurringBooking.update({
        where: { id: existing.id },
        data: { status: 'ACTIVE', seats: dto.seats ?? 1 },
        include: { scheduleTemplate: { include: { user: { include: { profile: true } } } } },
      }).then(this.toResponse);
    }

    const rb = await this.prisma.recurringBooking.create({
      data: {
        passengerId: userId,
        scheduleTemplateId: dto.scheduleTemplateId,
        seats: dto.seats ?? 1,
        status: 'ACTIVE',
      },
      include: { scheduleTemplate: { include: { user: { include: { profile: true } } } } },
    });

    return this.toResponse(rb);
  }

  async findMine(userId: string) {
    const rbs = await this.prisma.recurringBooking.findMany({
      where: { passengerId: userId, status: { not: 'CANCELLED' } },
      include: {
        scheduleTemplate: {
          include: { user: { include: { profile: true } }, vehicle: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rbs.map(this.toResponse);
  }

  async cancel(userId: string, id: string) {
    const rb = await this.prisma.recurringBooking.findUnique({ where: { id } });

    if (!rb) throw new NotFoundException('Subscrição não encontrada');
    if (rb.passengerId !== userId) throw new ForbiddenException('Sem permissão');

    await this.prisma.recurringBooking.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return { success: true };
  }

  private toResponse(rb: any) {
    const t = rb.scheduleTemplate;
    return {
      id: rb.id,
      seats: rb.seats,
      status: rb.status,
      createdAt: rb.createdAt,
      scheduleTemplate: t
        ? {
            id: t.id,
            origin: t.origin,
            destination: t.destination,
            time: t.time,
            daysOfWeek: t.daysOfWeek,
            priceCents: t.priceCents ?? null,
            meetingPoint: t.meetingPoint ?? null,
            driver: t.user
              ? {
                  id: t.user.id,
                  profile: t.user.profile
                    ? { name: t.user.profile.name, avatarUrl: t.user.profile.avatarUrl }
                    : null,
                }
              : null,
            vehicle: t.vehicle
              ? { brand: t.vehicle.brand, model: t.vehicle.model, color: t.vehicle.color }
              : null,
          }
        : null,
    };
  }
}
