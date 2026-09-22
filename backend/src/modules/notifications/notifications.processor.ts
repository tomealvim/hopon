import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { Resend } from 'resend';
import {
  EmailJobName,
  OtpEmailPayload,
  BookingCreatedEmailPayload,
  BookingStatusEmailPayload,
  BookingCancelledEmailPayload,
  RideCancelledEmailPayload,
  LateCancelWarningEmailPayload,
} from './email-jobs.types';
import {
  otpEmailHtml,
  bookingCreatedEmailHtml,
  bookingConfirmedEmailHtml,
  bookingDeclinedEmailHtml,
  bookingCancelledEmailHtml,
  rideCancelledEmailHtml,
  lateCancelWarningEmailHtml,
} from './email-templates';

type EmailJobPayload =
  | OtpEmailPayload
  | BookingCreatedEmailPayload
  | BookingStatusEmailPayload
  | BookingCancelledEmailPayload
  | RideCancelledEmailPayload
  | LateCancelWarningEmailPayload;

@Processor('email')
@Injectable()
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  async process(job: Job<EmailJobPayload, void, EmailJobName>): Promise<void> {
    const resendKey = this.config.get<string>('RESEND_API_KEY');
    const fromEmail = this.config.get<string>('RESEND_FROM') || 'onboarding@resend.dev';

    switch (job.name) {
      case 'email.otp': {
        const { to, code, purpose, expiryMinutes } = job.data as OtpEmailPayload;
        const subject = purpose === 'email'
          ? 'Código de verificação - HopOn'
          : 'Código de verificação de telefone - HopOn';
        if (resendKey) {
          const resend = new Resend(resendKey);
          await resend.emails.send({ from: fromEmail, to, subject, html: otpEmailHtml(code, purpose, expiryMinutes) });
        } else {
          this.logger.log(`[dev] OTP (${purpose}) para ${to}: ${code}`);
        }
        break;
      }

      case 'email.booking-created': {
        const { driverEmail, driverName, passengerName, origin, destination, departureTime, seats } =
          job.data as BookingCreatedEmailPayload;
        if (resendKey) {
          const resend = new Resend(resendKey);
          await resend.emails.send({
            from: fromEmail,
            to: driverEmail,
            subject: 'Nova reserva pendente - HopOn',
            html: bookingCreatedEmailHtml(driverName, passengerName, origin, destination, departureTime, seats),
          });
        } else {
          this.logger.log(`[dev] email.booking-created → ${driverEmail} (passageiro: ${passengerName})`);
        }
        break;
      }

      case 'email.booking-confirmed':
      case 'email.booking-declined': {
        const { passengerEmail, passengerName, origin, destination, departureTime, status } =
          job.data as BookingStatusEmailPayload;
        const isConfirmed = status === 'CONFIRMED';
        if (resendKey) {
          const resend = new Resend(resendKey);
          await resend.emails.send({
            from: fromEmail,
            to: passengerEmail,
            subject: isConfirmed ? 'Reserva confirmada - HopOn' : 'Reserva não aceite - HopOn',
            html: isConfirmed
              ? bookingConfirmedEmailHtml(passengerName, origin, destination, departureTime)
              : bookingDeclinedEmailHtml(passengerName, origin, destination, departureTime),
          });
        } else {
          this.logger.log(`[dev] ${job.name} → ${passengerEmail} (status: ${status})`);
        }
        break;
      }

      case 'email.booking-cancelled': {
        const { driverEmail, driverName, passengerName, origin, destination, departureTime } =
          job.data as BookingCancelledEmailPayload;
        if (resendKey) {
          const resend = new Resend(resendKey);
          await resend.emails.send({
            from: fromEmail,
            to: driverEmail,
            subject: 'Reserva cancelada - HopOn',
            html: bookingCancelledEmailHtml(driverName, passengerName, origin, destination, departureTime),
          });
        } else {
          this.logger.log(`[dev] email.booking-cancelled → ${driverEmail} (passageiro: ${passengerName})`);
        }
        break;
      }

      case 'email.ride-cancelled': {
        const { userEmail, userName, origin, destination, departureTime } =
          job.data as RideCancelledEmailPayload;
        if (resendKey) {
          const resend = new Resend(resendKey);
          await resend.emails.send({
            from: fromEmail,
            to: userEmail,
            subject: 'Boleia cancelada - HopOn',
            html: rideCancelledEmailHtml(userName, origin, destination, departureTime),
          });
        } else {
          this.logger.log(`[dev] email.ride-cancelled → ${userEmail}`);
        }
        break;
      }

      case 'email.late-cancel-warning': {
        const { userEmail, userName, count, windowDays } = job.data as LateCancelWarningEmailPayload;
        if (resendKey) {
          const resend = new Resend(resendKey);
          await resend.emails.send({
            from: fromEmail,
            to: userEmail,
            subject: 'Aviso de cancelamentos - HopOn',
            html: lateCancelWarningEmailHtml(userName, count, windowDays),
          });
        } else {
          this.logger.log(`[dev] email.late-cancel-warning → ${userEmail} (${count} cancelamentos)`);
        }
        break;
      }

      default:
        this.logger.warn(`Job desconhecido: ${job.name}`);
    }

    this.logger.log(`[NotificationsProcessor] job ${job.name} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, err: Error) {
    this.logger.error(`[NotificationsProcessor] job ${job.name} (id=${job.id}) failed: ${err.message}`);
  }
}
