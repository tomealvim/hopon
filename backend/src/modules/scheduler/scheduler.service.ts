import { Injectable, Logger, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { RideRequestsService } from '../ride-requests/ride-requests.service';

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
    private readonly rideRequestsService: RideRequestsService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // ─── 9.3 - Boleias recorrentes ────────────────────────────────────────────

  /**
   * Corre todos os dias às 06:00 - cria boleias para os próximos DAYS_AHEAD dias
   * a partir de todos os templates ativos.
   */
  @Cron('0 6 * * *', { name: 'generate-upcoming-rides', timeZone: 'Europe/Lisbon' })
  async generateUpcomingRides() {
    this.logger.log(`[cron] generateUpcomingRides - a gerar boleias para os próximos ${DAYS_AHEAD} dias`);

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
              priceCents: template.priceCents ?? null,
              status: 'SCHEDULED',
              scheduleTemplateId: template.id,
              ...(originLocationId && { originLocationId }),
              ...(destinationLocationId && { destinationLocationId }),
              ...(templatePolyline && { routePolyline: templatePolyline }),
              ...(template.meetingPoint && { meetingPoint: template.meetingPoint }),
            },
          });

          created++;
          this.logger.log(`[cron] Ride criada: ${ride.id} - ${date.toISOString().slice(0, 10)} ${template.time}`);

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

          // Criar reservas automáticas para passageiros com RecurringBooking ativo neste template
          const recurringBookings = await this.prisma.recurringBooking.findMany({
            where: { scheduleTemplateId: template.id, status: 'ACTIVE' },
            include: { passenger: { include: { profile: true } } },
          });

          for (const rb of recurringBookings) {
            // Verificar se o passageiro já tem reserva nesta ride
            const existingBooking = await this.prisma.booking.findFirst({
              where: { rideId: ride.id, userId: rb.passengerId },
            });
            if (existingBooking) continue;

            // Verificar se há lugares disponíveis
            const bookedSeats = await this.prisma.booking.aggregate({
              where: { rideId: ride.id, status: { in: ['PENDING', 'CONFIRMED'] } },
              _sum: { seats: true },
            });
            const usedSeats = bookedSeats._sum.seats ?? 0;
            if (usedSeats + rb.seats > ride.availableSeats) continue;

            try {
              await this.prisma.booking.create({
                data: {
                  rideId: ride.id,
                  userId: rb.passengerId,
                  seats: rb.seats,
                  status: 'CONFIRMED', // reserva recorrente confirma automaticamente
                },
              });

              void this.notificationsService.createNotification(
                rb.passengerId,
                'booking.confirmed',
                'Reserva automática criada',
                `A tua reserva recorrente para ${ride.origin} → ${ride.destination} às ${template.time} foi criada automaticamente.`,
                { rideId: ride.id },
              );
            } catch (err) {
              this.logger.error(`[cron] Erro ao criar reserva recorrente para passageiro ${rb.passengerId}: ${err}`);
            }
          }
        } catch (err) {
          this.logger.error(`[cron] Erro ao criar ride para template ${template.id} dia +${d}: ${err}`);
        }
      }
    }

    this.logger.log(`[cron] generateUpcomingRides concluído - criadas: ${created}, ignoradas: ${skipped}`);
  }

  // ─── 9.4 - Lembrete 1h antes da boleia ───────────────────────────────────

  /**
   * Corre a cada 5 minutos - envia lembrete a passageiros e condutor
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
          `${route} às ${dep} - ${totalSeats} lugar${totalSeats !== 1 ? 'es' : ''} reservado${totalSeats !== 1 ? 's' : ''}.`,
          { rideId: ride.id },
        );
      }

      this.logger.log(`[cron] Lembretes enviados para ride ${ride.id} (${ride.bookings.length} passageiros)`);
    }
  }

  // ─── 16.1c - Matching background (UserRoutes ↔ ScheduleTemplates) ─────────

  /**
   * Corre duas vezes por dia (7h e 17h) - cruza as rotas habituais dos passageiros
   * com os templates ativos dos condutores e notifica quando há sobreposição.
   * Deduplicação via Redis: nunca notifica o mesmo par mais do que 1x/dia.
   */
  @Cron('0 7,17 * * *', { name: 'route-matching', timeZone: 'Europe/Lisbon' })
  async matchUserRoutesWithTemplates() {
    this.logger.log('[cron] matchUserRoutesWithTemplates - a iniciar');

    const [userRoutes, templates] = await Promise.all([
      this.prisma.userRoute.findMany({
        where: { active: true, originLat: { not: null }, originLng: { not: null } },
        include: { user: { select: { id: true, profile: { select: { name: true } } } } },
      }),
      this.prisma.scheduleTemplate.findMany({
        where: { active: true },
        include: {
          user: {
            select: { id: true, profile: { select: { name: true } } },
          },
        },
      }),
    ]);

    // Pré-carregar a polilinha mais recente de cada template (uma query por template, em paralelo)
    const templatePolylines = new Map<string, { lat: number; lng: number }[] | null>();
    await Promise.all(
      templates.map(async (t) => {
        const ride = await this.prisma.ride.findFirst({
          where: { scheduleTemplateId: t.id, routePolyline: { not: null } },
          orderBy: { createdAt: 'desc' },
          select: { routePolyline: true },
        });
        templatePolylines.set(t.id, ride?.routePolyline as { lat: number; lng: number }[] | null ?? null);
      }),
    );

    let notified = 0;
    let skipped = 0;

    for (const route of userRoutes) {
      const passengerId = route.userId;
      const routeDays = route.daysOfWeek as string[];
      const routeMinutes = this.timeToMinutes(route.departTime);

      for (const template of templates) {
        // Não notificar o próprio condutor
        if (template.userId === passengerId) continue;

        const templateDays = template.daysOfWeek as string[];

        // 1 - Sobreposição de dias
        const commonDays = routeDays.filter((d) => templateDays.includes(d));
        if (commonDays.length === 0) continue;

        // 2 - Hora compatível (±45 min)
        const templateMinutes = this.timeToMinutes(template.time);
        if (Math.abs(routeMinutes - templateMinutes) > 45) continue;

        // 3 - Proximidade de rota
        const polyline = templatePolylines.get(template.id);
        const withinCorridor = this.isPassengerNearRoute(
          route.originLat!,
          route.originLng!,
          polyline,
        );
        if (!withinCorridor) continue;

        // 4 - Passageiro já tem reserva ativa neste template?
        const existingBooking = await this.prisma.booking.findFirst({
          where: {
            userId: passengerId,
            status: { in: ['PENDING', 'CONFIRMED'] },
            ride: { scheduleTemplateId: template.id },
          },
        });
        if (existingBooking) { skipped++; continue; }

        // 5 - Deduplicação Redis (TTL 24h)
        const dedupKey = `match:${passengerId}:${template.userId}:${template.id}`;
        const alreadyNotified = await this.cache.get(dedupKey);
        if (alreadyNotified) { skipped++; continue; }
        await this.cache.set(dedupKey, true, 24 * 60 * 60 * 1000);

        // 6 - Notificar passageiro
        const driverName = template.user?.profile?.name ?? 'Um condutor';
        const nextDay = commonDays[0];
        const timeLabel = template.time;

        void this.notificationsService.createNotification(
          passengerId,
          'match.route',
          'Boleia compatível encontrada',
          `${driverName} passa perto de ti ${this.dayLabel(nextDay)} às ${timeLabel} no trajeto ${template.origin} → ${template.destination}. Queres pedir lugar?`,
          { scheduleTemplateId: template.id, driverId: template.userId },
        );

        // 16.1c.4 - Notificar também o condutor (dedup separado, TTL 24h)
        const driverDedupKey = `match:driver:${template.userId}:${passengerId}:${template.id}`;
        const driverAlreadyNotified = await this.cache.get(driverDedupKey);
        if (!driverAlreadyNotified) {
          await this.cache.set(driverDedupKey, true, 24 * 60 * 60 * 1000);
          const passengerName = (route.user as any)?.profile?.name ?? 'Um passageiro';
          void this.notificationsService.createNotification(
            template.userId,
            'match.passenger',
            'Passageiro compatível encontrado',
            `${passengerName} tem um trajeto compatível com a tua boleia ${template.origin} → ${template.destination} ${this.dayLabel(nextDay)} às ${timeLabel}.`,
            { scheduleTemplateId: template.id, passengerId },
          );
        }

        notified++;
        this.logger.log(`[cron] Match: passenger ${passengerId} ↔ template ${template.id} (driver ${template.userId})`);
      }
    }

    this.logger.log(`[cron] matchUserRoutesWithTemplates concluído - notificados: ${notified}, ignorados: ${skipped}`);
  }

  // ─── Helpers de matching ──────────────────────────────────────────────────

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6_371_000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private pointToSegmentMeters(
    pLat: number, pLng: number,
    aLat: number, aLng: number,
    bLat: number, bLng: number,
  ): number {
    const dx = bLat - aLat;
    const dy = bLng - aLng;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return this.haversineMeters(pLat, pLng, aLat, aLng);
    const t = Math.max(0, Math.min(1, ((pLat - aLat) * dx + (pLng - aLng) * dy) / lenSq));
    return this.haversineMeters(pLat, pLng, aLat + t * dx, aLng + t * dy);
  }

  /**
   * Verifica se o ponto do passageiro está dentro do corredor da rota do condutor.
   * Threshold: 1500m (mais permissivo que o booking - é uma sugestão, não confirmação).
   * Se não houver polilinha, usa Haversine ponto-a-ponto como fallback.
   */
  private isPassengerNearRoute(
    lat: number,
    lng: number,
    polyline: { lat: number; lng: number }[] | null,
  ): boolean {
    const THRESHOLD_M = 1500;

    if (!polyline || polyline.length === 0) return false;

    if (polyline.length === 1) {
      return this.haversineMeters(lat, lng, polyline[0].lat, polyline[0].lng) <= THRESHOLD_M;
    }

    for (let i = 0; i < polyline.length - 1; i++) {
      const d = this.pointToSegmentMeters(lat, lng, polyline[i].lat, polyline[i].lng, polyline[i + 1].lat, polyline[i + 1].lng);
      if (d <= THRESHOLD_M) return true;
    }
    return false;
  }

  private dayLabel(day: string): string {
    const map: Record<string, string> = {
      segunda: 'segunda-feira', terca: 'terça-feira', quarta: 'quarta-feira',
      quinta: 'quinta-feira', sexta: 'sexta-feira', sabado: 'sábado',
    };
    return map[day] ?? day;
  }

  // ─── 16.4 - Match ride requests com schedule templates ───────────────────

  /**
   * Corre diariamente às 9h - cruza pedidos de boleia abertos (RideRequest)
   * com templates de condutores ativos (ScheduleTemplate).
   * Notifica condutores quando há passageiro à procura na sua rota.
   * Deduplicação via Redis: nunca notificar o mesmo par mais de 1x/dia.
   */
  @Cron('0 9 * * *', { name: 'ride-request-matching', timeZone: 'Europe/Lisbon' })
  async matchRideRequestsWithTemplates() {
    this.logger.log('[cron] matchRideRequestsWithTemplates - a iniciar');

    const [rideRequests, templates] = await Promise.all([
      this.rideRequestsService.findAllOpen(),
      this.prisma.scheduleTemplate.findMany({
        where: { active: true },
        include: { user: { include: { profile: true } } },
      }),
    ]);

    this.logger.log(`[cron] ${rideRequests.length} pedidos abertos, ${templates.length} templates ativos`);

    let notified = 0;
    let skipped = 0;

    for (const request of rideRequests) {
      const requestDays = request.daysOfWeek as string[];
      const [rh, rm] = request.departTime.split(':').map(Number);
      const requestMin = rh * 60 + rm;

      for (const template of templates) {
        // Não notificar o próprio passageiro se também for condutor
        if (template.userId === request.passengerId) continue;

        // Sobreposição de dias
        const templateDays = template.daysOfWeek as string[];
        const sharedDays = requestDays.filter((d) => templateDays.includes(d));
        if (sharedDays.length === 0) continue;

        // Compatibilidade horária ±45 min
        const [th, tm] = template.time.split(':').map(Number);
        const templateMin = th * 60 + tm;
        if (Math.abs(requestMin - templateMin) > 45) continue;

        // Proximidade geográfica (corredor 2km) - se temos coords
        if (
          request.originLat != null && request.originLng != null &&
          template.user // template não tem coords diretas - usar text overlap como fallback
        ) {
          // Texto de origem/destino deve ter alguma sobreposição
          const origMatch = this.textOverlap(request.origin, template.origin);
          const destMatch = this.textOverlap(request.destination, template.destination);
          if (!origMatch && !destMatch) continue;
        }

        // Deduplicação Redis
        const dedupKey = `rr:${request.passengerId}:${template.userId}:${template.id}`;
        const alreadySent = await this.cache.get(dedupKey);
        if (alreadySent) { skipped++; continue; }
        await this.cache.set(dedupKey, true, 24 * 60 * 60 * 1000);

        // Notificar o condutor
        const passengerName = request.passenger?.profile?.name ?? 'Um passageiro';
        const dayLabels = sharedDays.slice(0, 3).map((d) => this.dayLabel(d)).join(', ');

        void this.notificationsService.createNotification(
          template.userId,
          'ride_request.match',
          'Passageiro procura boleia na tua rota',
          `${passengerName} procura boleia ${request.origin} → ${request.destination} às ${request.departTime} (${dayLabels})`,
          {
            rideRequestId: request.id,
            passengerId: request.passengerId,
            origin: request.origin,
            destination: request.destination,
            departTime: request.departTime,
            note: request.note,
          },
        );

        notified++;
      }
    }

    this.logger.log(`[cron] matchRideRequestsWithTemplates concluído - notificados: ${notified}, ignorados: ${skipped}`);
  }

  /** Trigger manual para testes */
  async triggerRideRequestMatching() {
    return this.matchRideRequestsWithTemplates();
  }

  private textOverlap(a: string, b: string): boolean {
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const na = norm(a); const nb = norm(b);
    return na.includes(nb) || nb.includes(na);
  }
}
