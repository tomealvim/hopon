import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsService } from '../events/events.service';
import { PushService } from './push.service';
import {
  OtpEmailPayload,
  BookingCreatedEmailPayload,
  BookingStatusEmailPayload,
  BookingCancelledEmailPayload,
  RideCancelledEmailPayload,
  LateCancelWarningEmailPayload,
} from './email-jobs.types';

type PushPrefs = { messages: boolean; bookings: boolean; rides: boolean; matches: boolean };

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly pushService: PushService,
    @InjectQueue('email') private readonly queue: Queue,
  ) {}

  // ─── In-app notifications ────────────────────────────────────────────────────

  private static readonly PUSH_CATEGORY: Record<string, keyof PushPrefs> = {
    'message.new': 'messages',
    'booking.new': 'bookings',
    'booking.confirmed': 'bookings',
    'booking.declined': 'bookings',
    'booking.cancelled': 'bookings',
    'booking.no_show_claimed': 'bookings',
    'booking.confirm_presence': 'bookings',
    'ride.completed': 'rides',
    'ride.arrived': 'rides',
    'ride.on_the_way': 'rides',
    'ride.updated': 'rides',
    'ride.cancelled': 'rides',
    'match.found': 'matches',
    'arrangement.proposed': 'matches',
    'arrangement.accepted': 'matches',
    'arrangement.declined': 'matches',
  };

  private static readonly TAB_BY_TYPE: Record<string, string> = {
    'message.new': 'inbox',
    'booking.new': 'rides',
    'booking.confirmed': 'rides',
    'booking.declined': 'rides',
    'booking.cancelled': 'rides',
    'ride.updated': 'rides',
    'ride.arrived': 'rides',
    'ride.completed': 'rides',
    'ride.cancelled': 'rides',
    'ride.on_the_way': 'rides',
    'match.found': 'discover',
    'arrangement.proposed': 'discover',
    'arrangement.accepted': 'rides',
    'arrangement.declined': 'rides',
  };

  async createNotification(
    userId: string,
    type: string,
    title: string,
    body: string,
    metadata?: Record<string, unknown>,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        metadata: metadata as any,
      },
    });

    // Push via SSE para o utilizador se estiver ligado
    this.eventsService.emit(userId, 'notification.new', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      metadata: notification.metadata,
      createdAt: notification.createdAt,
    });

    // Push notification (web push) — verifica preferencias antes de enviar
    const tab = NotificationsService.TAB_BY_TYPE[type] ?? 'discover';
    const category = NotificationsService.PUSH_CATEGORY[type];
    if (category) {
      const userPrefs = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { pushPreferences: true },
      });
      const prefs = (userPrefs?.pushPreferences as Partial<PushPrefs> | null) ?? {};
      const enabled = prefs[category] !== false; // default true se nao definido
      if (enabled) {
        void this.pushService.sendToUser(userId, title, body, { ...metadata, tab });
      }
    } else {
      void this.pushService.sendToUser(userId, title, body, { ...metadata, tab });
    }

    return notification;
  }

  async findForUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) throw new NotFoundException('Notificação não encontrada');
    if (notification.userId !== userId) throw new ForbiddenException();

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async countUnread(userId: string) {
    return this.prisma.notification.count({ where: { userId, read: false } });
  }

  async queueOtpEmail(to: string, code: string, purpose: 'email' | 'phone', expiryMinutes: number) {
    const payload: OtpEmailPayload = { to, code, purpose, expiryMinutes };
    await this.queue.add('email.otp', payload);
  }

  async queueBookingCreatedEmail(
    driverEmail: string,
    driverName: string,
    passengerName: string,
    origin: string,
    destination: string,
    departureTime: string,
    seats: number,
  ) {
    const payload: BookingCreatedEmailPayload = {
      driverEmail,
      driverName,
      passengerName,
      origin,
      destination,
      departureTime,
      seats,
    };
    await this.queue.add('email.booking-created', payload);
  }

  async queueBookingStatusEmail(
    passengerEmail: string,
    passengerName: string,
    origin: string,
    destination: string,
    departureTime: string,
    status: 'CONFIRMED' | 'DECLINED',
  ) {
    const payload: BookingStatusEmailPayload = {
      passengerEmail,
      passengerName,
      origin,
      destination,
      departureTime,
      status,
    };
    const jobName = status === 'CONFIRMED' ? 'email.booking-confirmed' : 'email.booking-declined';
    await this.queue.add(jobName, payload);
  }

  async queueBookingCancelledEmail(
    driverEmail: string,
    driverName: string,
    passengerName: string,
    origin: string,
    destination: string,
    departureTime: string,
  ) {
    const payload: BookingCancelledEmailPayload = {
      driverEmail,
      driverName,
      passengerName,
      origin,
      destination,
      departureTime,
    };
    await this.queue.add('email.booking-cancelled', payload);
  }

  async queueLateCancelWarningEmail(userEmail: string, userName: string, count: number) {
    const payload: LateCancelWarningEmailPayload = { userEmail, userName, count, windowDays: 30 };
    await this.queue.add('email.late-cancel-warning', payload);
  }

  async notifyRideUpdated(
    rideId: string,
    origin: string,
    destination: string,
    departureTime: Date,
    changedFields: string[],
    affectedUserIds: string[],
  ) {
    if (affectedUserIds.length === 0) return;

    const fieldLabels: Record<string, string> = {
      origin: 'origem',
      destination: 'destino',
      departureTime: 'hora de partida',
    };
    const changed = changedFields.map((f) => fieldLabels[f] ?? f).join(', ');
    const title = 'Boleia atualizada';
    const body = `A boleia ${origin} → ${destination} foi alterada: ${changed}.`;

    for (const userId of affectedUserIds) {
      void this.createNotification(userId, 'ride.updated', title, body, {
        rideId,
        changedFields,
        origin,
        destination,
        departureTime: departureTime.toISOString(),
      });
    }
  }

  async notifyDriverArrived(
    rideId: string,
    origin: string,
    destination: string,
    passengerUserIds: string[],
  ) {
    if (passengerUserIds.length === 0) return;

    const title = 'Condutor no ponto!';
    const body = `O teu condutor chegou ao ponto de encontro para a boleia ${origin} → ${destination}. Tens 10 minutos para aparecer.`;

    for (const userId of passengerUserIds) {
      void this.createNotification(userId, 'ride.arrived', title, body, {
        rideId,
        origin,
        destination,
      });
    }

    // Emitir SSE ride.arrived para passageiros conectados
    for (const userId of passengerUserIds) {
      this.eventsService.emit(userId, 'ride.arrived', { rideId, origin, destination });
    }
  }

  async notifyDriverOnTheWay(
    rideId: string,
    origin: string,
    destination: string,
    departureTime: Date,
    passengerUserIds: string[],
  ) {
    if (passengerUserIds.length === 0) return;

    const depMin = departureTime.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' });
    const title = 'Condutor a caminho!';
    const body = `O teu condutor está a caminho para a boleia ${origin} → ${destination} (${depMin}). Prepara-te para sair!`;

    for (const userId of passengerUserIds) {
      void this.createNotification(userId, 'ride.on_the_way', title, body, {
        rideId,
        origin,
        destination,
      });
    }

    for (const userId of passengerUserIds) {
      this.eventsService.emit(userId, 'ride.on_the_way', { rideId, origin, destination });
    }
  }

  async notifyRideCancelled(
    rideId: string,
    rideOrigin: string,
    rideDestination: string,
    rideDepartureTime: Date,
    confirmedUserIds: string[],
    pendingUserIds: string[] = [],
  ) {
    const allIds = [...new Set([...confirmedUserIds, ...pendingUserIds])];
    if (allIds.length === 0) return;

    const users = await this.prisma.user.findMany({
      where: { id: { in: allIds } },
      include: { profile: true },
    });

    this.logger.log(
      `Boleia cancelada: ${rideOrigin} → ${rideDestination} — ${confirmedUserIds.length} confirmados, ${pendingUserIds.length} pendentes`,
    );

    const route = `${rideOrigin} → ${rideDestination}`;
    const timeStr = rideDepartureTime.toLocaleTimeString('pt-PT', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon',
    });
    const departureTime = rideDepartureTime.toISOString();

    for (const user of users) {
      const userName = user.profile?.name || user.email;
      const isConfirmed = confirmedUserIds.includes(user.id);

      // In-app + push (urgente para confirmados, normal para pendentes)
      if (isConfirmed) {
        void this.createNotification(
          user.id,
          'ride.cancelled_confirmed',
          'Boleia cancelada',
          `A tua boleia ${route} às ${timeStr} foi cancelada pelo condutor. O teu pagamento será reembolsado.`,
          { rideId, origin: rideOrigin, destination: rideDestination },
        );
      } else {
        void this.createNotification(
          user.id,
          'ride.cancelled_pending',
          'Pedido de lugar cancelado',
          `A boleia ${route} às ${timeStr} foi cancelada. O teu pedido foi removido.`,
          { rideId },
        );
      }

      // Email para todos
      const payload: RideCancelledEmailPayload = {
        userEmail: user.email,
        userName,
        origin: rideOrigin,
        destination: rideDestination,
        departureTime,
      };
      await this.queue.add('email.ride-cancelled', payload);
    }
  }
}
