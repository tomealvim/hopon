import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GeocodingService } from '../geocoding/geocoding.service';

const DAY_NAMES = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

// Quantos dias à frente criar boleias recorrentes
const DAYS_AHEAD = 7;

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly geocodingService: GeocodingService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // ─── 9.3 — Boleias recorrentes ────────────────────────────────────────────

  /**
   * Corre todos os dias às 06:00 — cria boleias para os próximos DAYS_AHEAD dias
   * a partir de todos os templates ativos.
   */
  @Cron('0 6 * * *', { name: 'generate-upcoming-rides', timeZone: 'Europe/Lisbon' })
  async generateUpcomingRides() {
    this.logger.log(`[cron] generateUpcomingRides — a gerar boleias para os próximos ${DAYS_AHEAD} dias`);

    const templates = await this.prisma.scheduleTemplate.findMany({
      where: { active: true },
    });

    let created = 0;
    let skipped = 0;

    for (const template of templates) {
      const templateDays = template.daysOfWeek as string[];
      const [hours, minutes] = template.time.split(':').map(Number);

      // Geocodificar + polilinha uma vez por template (reutilizar para todos os dias)
      const [originCoords, destCoords] = await Promise.all([
        this.geocodingService.geocodeText(template.origin),
        this.geocodingService.geocodeText(template.destination),
      ]);

      let templatePolyline: { lat: number; lng: number }[] | null = null;
      if (originCoords && destCoords) {
        templatePolyline = await this.geocodingService.getRoutePolyline(
          originCoords.lat, originCoords.lng,
          destCoords.lat, destCoords.lng,
        );
      }

      for (let d = 0; d < DAYS_AHEAD; d++) {
        const date = new Date();
        date.setDate(date.getDate() + d);
        date.setHours(0, 0, 0, 0);

        const dayName = DAY_NAMES[date.getDay()];
        if (!templateDays.includes(dayName)) continue;

        const departureTime = new Date(date);
        departureTime.setHours(hours, minutes, 0, 0);

        // Ignorar se a hora de partida já passou
        if (departureTime <= new Date()) continue;

        // Verificar duplicado
        const startOfDay = new Date(date);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const existing = await this.prisma.ride.findFirst({
          where: {
            scheduleTemplateId: template.id,
            departureTime: { gte: startOfDay, lte: endOfDay },
          },
        });

        if (existing) { skipped++; continue; }

        try {
          // Criar Location records se geocoding funcionou
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
              driverId: template.userId,
              vehicleId: template.vehicleId,
              origin: template.origin,
              destination: template.destination,
              departureTime,
              availableSeats: template.availableSeats,
              price: template.price ?? null,
              status: 'SCHEDULED',
              scheduleTemplateId: template.id,
              ...(originLocationId && { originLocationId }),
              ...(destinationLocationId && { destinationLocationId }),
              ...(templatePolyline && { routePolyline: templatePolyline }),
            },
          });

          created++;
          this.logger.log(`[cron] Ride criada: ${ride.id} — ${date.toISOString().slice(0, 10)} ${template.time}`);

          // Notificar condutor apenas para hoje (d === 0) para não spam
          if (d === 0) {
            void this.notificationsService.createNotification(
              template.userId,
              'ride.auto-created',
              'Boleia publicada automaticamente',
              `A tua boleia ${template.origin} → ${template.destination} às ${template.time} foi publicada para hoje.`,
              { rideId: ride.id, templateId: template.id },
            );
          }
        } catch (err) {
          this.logger.error(`[cron] Erro ao criar ride para template ${template.id} dia +${d}: ${err}`);
        }
      }
    }

    this.logger.log(`[cron] generateUpcomingRides concluído — criadas: ${created}, ignoradas: ${skipped}`);
  }

  // ─── 9.4 — Lembrete 1h antes da boleia ───────────────────────────────────

  /**
   * Corre a cada 5 minutos — envia lembrete a passageiros e condutor
   * para boleias que partem entre 55 e 65 minutos.
   */
  @Cron('*/5 * * * *', { name: 'ride-reminders', timeZone: 'Europe/Lisbon' })
  async sendRideReminders() {
    const now = new Date();
    const from = new Date(now.getTime() + 55 * 60 * 1000); // 55 min
    const to   = new Date(now.getTime() + 65 * 60 * 1000); // 65 min

    const rides = await this.prisma.ride.findMany({
      where: {
        status: 'SCHEDULED',
        departureTime: { gte: from, lte: to },
      },
      include: {
        bookings: {
          where: { status: 'CONFIRMED' },
          select: { userId: true, seats: true },
        },
      },
    });

    for (const ride of rides) {
      const cacheKey = `reminder:${ride.id}`;
      const alreadySent = await this.cache.get(cacheKey);
      if (alreadySent) continue;

      // Marcar como enviado (TTL 3h para evitar duplicados)
      await this.cache.set(cacheKey, true, 3 * 60 * 60 * 1000);

      const dep = ride.departureTime.toLocaleTimeString('pt-PT', {
        hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon',
      });
      const route = `${ride.origin} → ${ride.destination}`;

      // Notificar passageiros confirmados
      for (const booking of ride.bookings) {
        void this.notificationsService.createNotification(
          booking.userId,
          'ride.reminder',
          'A tua boleia parte em 1 hora',
          `${route} às ${dep}. Prepara-te para a partida!`,
          { rideId: ride.id },
        );
      }

      // Notificar condutor (se houver passageiros)
      if (ride.bookings.length > 0) {
        const totalSeats = ride.bookings.reduce((s, b) => s + b.seats, 0);
        void this.notificationsService.createNotification(
          ride.driverId,
          'ride.reminder',
          'A tua boleia parte em 1 hora',
          `${route} às ${dep} — ${totalSeats} lugar${totalSeats !== 1 ? 'es' : ''} reservado${totalSeats !== 1 ? 's' : ''}.`,
          { rideId: ride.id },
        );
      }

      this.logger.log(`[cron] Lembretes enviados para ride ${ride.id} (${ride.bookings.length} passageiros)`);
    }
  }
}
