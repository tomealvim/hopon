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
} from './email-jobs.types';

type EmailJobPayload =
  | OtpEmailPayload
  | BookingCreatedEmailPayload
  | BookingStatusEmailPayload
  | BookingCancelledEmailPayload
  | RideCancelledEmailPayload;

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
        const subject =
          purpose === 'email'
            ? 'Código de verificação Hopon'
            : 'Código de verificação de telefone Hopon';
        const html =
          purpose === 'email'
            ? `<p>O teu código de verificação é: <strong>${code}</strong></p><p>Válido por ${expiryMinutes} minutos.</p>`
            : `<p>O teu código de verificação de telefone é: <strong>${code}</strong></p><p>Válido por ${expiryMinutes} minutos.</p>`;
        if (resendKey) {
          const resend = new Resend(resendKey);
          await resend.emails.send({ from: fromEmail, to, subject, html });
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
            subject: 'Nova reserva pendente — Hopon',
            html: `<p>Olá ${driverName},</p><p><strong>${passengerName}</strong> reservou ${seats} lugar(es) na tua boleia de <strong>${origin}</strong> para <strong>${destination}</strong> (${departureTime}).</p><p>Acede à app para confirmar ou recusar.</p>`,
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
            subject: isConfirmed ? 'Reserva confirmada — Hopon' : 'Reserva recusada — Hopon',
            html: isConfirmed
              ? `<p>Olá ${passengerName},</p><p>A tua reserva de <strong>${origin}</strong> para <strong>${destination}</strong> (${departureTime}) foi <strong>confirmada</strong>.</p>`
              : `<p>Olá ${passengerName},</p><p>Infelizmente a tua reserva de <strong>${origin}</strong> para <strong>${destination}</strong> (${departureTime}) foi <strong>recusada</strong>.</p>`,
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
            subject: 'Reserva cancelada pelo passageiro — Hopon',
            html: `<p>Olá ${driverName},</p><p><strong>${passengerName}</strong> cancelou a reserva na boleia de <strong>${origin}</strong> para <strong>${destination}</strong> (${departureTime}).</p>`,
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
            subject: 'Boleia cancelada — Hopon',
            html: `<p>Olá ${userName},</p><p>A boleia de <strong>${origin}</strong> para <strong>${destination}</strong> (${departureTime}) foi cancelada.</p>`,
          });
        } else {
          this.logger.log(`[dev] email.ride-cancelled → ${userEmail}`);
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
