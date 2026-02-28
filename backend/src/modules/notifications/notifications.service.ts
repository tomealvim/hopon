import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OtpEmailPayload,
  BookingCreatedEmailPayload,
  BookingStatusEmailPayload,
  BookingCancelledEmailPayload,
  RideCancelledEmailPayload,
} from './email-jobs.types';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('email') private readonly queue: Queue,
  ) {}

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

  async notifyRideCancelled(
    rideId: string,
    rideOrigin: string,
    rideDestination: string,
    rideDepartureTime: Date,
    affectedUserIds: string[],
  ) {
    if (affectedUserIds.length === 0) {
      return;
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: affectedUserIds } },
      include: { profile: true },
    });

    this.logger.log(
      `Boleia cancelada: ${rideOrigin} → ${rideDestination} (${rideDepartureTime.toISOString()})`,
    );
    this.logger.log(`Notificando ${users.length} utilizador(es) afetado(s):`);

    const departureTime = rideDepartureTime.toISOString();

    for (const user of users) {
      const userName = user.profile?.name || user.email;
      this.logger.log(`  - ${userName} (${user.email})`);

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
