import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RecurringArrangementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Condutor propõe arranjo recorrente a um passageiro de uma boleia já concluída */
  async propose(
    proposerId: string,
    rideId: string,
    passengerId: string,
    note?: string,
  ) {
    const ride = await this.prisma.ride.findUnique({
      where: { id: rideId },
      include: { bookings: true },
    });
    if (!ride) throw new NotFoundException('Boleia não encontrada');
    if (ride.driverId !== proposerId)
      throw new ForbiddenException(
        'Só o condutor pode propor arranjos desta boleia',
      );
    if (ride.status !== 'COMPLETED')
      throw new BadRequestException(
        'Só é possível propor arranjos após a boleia estar concluída',
      );
    if (!ride.scheduleTemplateId)
      throw new BadRequestException(
        'Esta boleia não tem um template de horário associado',
      );

    const booking = ride.bookings.find(
      (b) => b.userId === passengerId && b.status === 'CONFIRMED',
    );
    if (!booking)
      throw new BadRequestException(
        'O passageiro não tem reserva confirmada nesta boleia',
      );

    const arrangement = await this.prisma.recurringArrangement.upsert({
      where: {
        driverId_passengerId_scheduleTemplateId: {
          driverId: proposerId,
          passengerId,
          scheduleTemplateId: ride.scheduleTemplateId,
        },
      },
      create: {
        driverId: proposerId,
        passengerId,
        scheduleTemplateId: ride.scheduleTemplateId,
        proposedById: proposerId,
        note: note ?? null,
        status: 'PENDING',
      },
      update: {
        status: 'PENDING',
        proposedById: proposerId,
        note: note ?? null,
      },
    });

    const driver = await this.prisma.user.findUnique({
      where: { id: proposerId },
      include: { profile: true },
    });
    const driverName = driver?.profile?.name ?? 'O condutor';
    await this.notificationsService.createNotification(
      passengerId,
      'ARRANGEMENT_PROPOSED',
      'Proposta de boleia recorrente',
      `${driverName} quer repetir regularmente o percurso ${ride.origin} → ${ride.destination}. Aceitas?`,
      { arrangementId: arrangement.id },
    );

    return arrangement;
  }

  /** Passageiro aceita ou recusa a proposta */
  async respond(userId: string, arrangementId: string, accept: boolean) {
    const arrangement = await this.prisma.recurringArrangement.findUnique({
      where: { id: arrangementId },
      include: { scheduleTemplate: true },
    });
    if (!arrangement) throw new NotFoundException('Arranjo não encontrado');
    if (arrangement.passengerId !== userId)
      throw new ForbiddenException('Só o destinatário pode responder');
    if (arrangement.status !== 'PENDING')
      throw new BadRequestException('Arranjo já foi respondido');

    if (accept) {
      await this.prisma.recurringArrangement.update({
        where: { id: arrangementId },
        data: { status: 'ACTIVE' },
      });

      await this.prisma.recurringBooking.upsert({
        where: {
          passengerId_scheduleTemplateId: {
            passengerId: userId,
            scheduleTemplateId: arrangement.scheduleTemplateId,
          },
        },
        create: {
          passengerId: userId,
          scheduleTemplateId: arrangement.scheduleTemplateId,
          seats: 1,
          status: 'ACTIVE',
        },
        update: { status: 'ACTIVE' },
      });

      const passenger = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
      const passengerName = passenger?.profile?.name ?? 'O passageiro';
      await this.notificationsService.createNotification(
        arrangement.driverId,
        'ARRANGEMENT_ACCEPTED',
        'Arranjo recorrente aceite',
        `${passengerName} aceitou repetir regularmente o percurso ${arrangement.scheduleTemplate.origin} → ${arrangement.scheduleTemplate.destination}.`,
        { arrangementId },
      );
    } else {
      await this.prisma.recurringArrangement.update({
        where: { id: arrangementId },
        data: { status: 'DECLINED' },
      });

      const passenger = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
      const passengerName = passenger?.profile?.name ?? 'O passageiro';
      await this.notificationsService.createNotification(
        arrangement.driverId,
        'ARRANGEMENT_DECLINED',
        'Proposta recusada',
        `${passengerName} recusou a proposta de boleia recorrente.`,
        { arrangementId },
      );
    }

    return { ok: true };
  }

  /** Listar arranjos do utilizador (como condutor e como passageiro) */
  async findMine(userId: string) {
    const [asDriver, asPassenger] = await Promise.all([
      this.prisma.recurringArrangement.findMany({
        where: { driverId: userId, status: { in: ['PENDING', 'ACTIVE'] } },
        include: {
          passenger: { include: { profile: true } },
          scheduleTemplate: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.recurringArrangement.findMany({
        where: { passengerId: userId, status: { in: ['PENDING', 'ACTIVE'] } },
        include: {
          driver: { include: { profile: true } },
          scheduleTemplate: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      asDriver: asDriver.map((a) => this.toResponse(a, 'driver')),
      asPassenger: asPassenger.map((a) => this.toResponse(a, 'passenger')),
    };
  }

  /** Terminar arranjo */
  async end(userId: string, arrangementId: string) {
    const arrangement = await this.prisma.recurringArrangement.findUnique({
      where: { id: arrangementId },
      include: { scheduleTemplate: true },
    });
    if (!arrangement) throw new NotFoundException('Arranjo não encontrado');
    if (arrangement.driverId !== userId && arrangement.passengerId !== userId) {
      throw new ForbiddenException(
        'Só os participantes podem terminar o arranjo',
      );
    }
    if (arrangement.status === 'ENDED')
      throw new BadRequestException('Arranjo já terminado');

    await this.prisma.recurringArrangement.update({
      where: { id: arrangementId },
      data: { status: 'ENDED' },
    });

    await this.prisma.recurringBooking.updateMany({
      where: {
        passengerId: arrangement.passengerId,
        scheduleTemplateId: arrangement.scheduleTemplateId,
        status: 'ACTIVE',
      },
      data: { status: 'CANCELLED' },
    });

    const otherUserId =
      userId === arrangement.driverId
        ? arrangement.passengerId
        : arrangement.driverId;
    const terminator = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    const terminatorName = terminator?.profile?.name ?? 'O participante';
    await this.notificationsService.createNotification(
      otherUserId,
      'ARRANGEMENT_ENDED',
      'Arranjo recorrente terminado',
      `${terminatorName} terminou o arranjo recorrente para ${arrangement.scheduleTemplate.origin} → ${arrangement.scheduleTemplate.destination}. As reservas automáticas foram canceladas.`,
      { arrangementId },
    );

    return { ok: true };
  }

  private toResponse(a: any, role: 'driver' | 'passenger') {
    const other = role === 'driver' ? a.passenger : a.driver;
    return {
      id: a.id,
      status: a.status,
      proposedById: a.proposedById,
      note: a.note,
      createdAt: a.createdAt,
      scheduleTemplate: a.scheduleTemplate
        ? {
            id: a.scheduleTemplate.id,
            origin: a.scheduleTemplate.origin,
            destination: a.scheduleTemplate.destination,
            time: a.scheduleTemplate.time,
            daysOfWeek: a.scheduleTemplate.daysOfWeek,
          }
        : null,
      otherUser: other
        ? {
            id: other.id,
            name: other.profile?.name ?? other.email,
            avatarUrl: other.profile?.avatarUrl ?? null,
          }
        : null,
    };
  }
}
