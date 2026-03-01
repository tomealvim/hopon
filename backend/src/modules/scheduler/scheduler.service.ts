import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// Mapeamento getDay() → nome português usado nos ScheduleTemplates
const DAY_NAMES = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Corre todos os dias às 06:00 — cria boleias para os templates ativos de hoje */
  @Cron('0 6 * * *', { name: 'generate-daily-rides', timeZone: 'Europe/Lisbon' })
  async generateDailyRides() {
    const today = new Date();
    const todayName = DAY_NAMES[today.getDay()];

    this.logger.log(`[cron] generateDailyRides — ${today.toISOString().slice(0, 10)} (${todayName})`);

    // Todos os templates ativos
    const templates = await this.prisma.scheduleTemplate.findMany({
      where: { active: true },
    });

    // Filtrar os que incluem hoje
    const todayTemplates = templates.filter((t) => {
      const days = t.daysOfWeek as string[];
      return days.includes(todayName);
    });

    this.logger.log(`[cron] ${todayTemplates.length} templates para hoje`);

    let created = 0;
    let skipped = 0;

    for (const template of todayTemplates) {
      try {
        // Construir departureTime = hoje + hora do template
        const [hours, minutes] = template.time.split(':').map(Number);
        const departureTime = new Date(today);
        departureTime.setHours(hours, minutes, 0, 0);

        // Janela do dia: 00:00–23:59:59
        const startOfDay = new Date(today);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setHours(23, 59, 59, 999);

        // Verificar duplicado — já existe boleia deste template para hoje?
        const existing = await this.prisma.ride.findFirst({
          where: {
            scheduleTemplateId: template.id,
            departureTime: { gte: startOfDay, lte: endOfDay },
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Criar a boleia
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
          },
        });

        created++;
        this.logger.log(`[cron] Ride criada: ${ride.id} (${template.origin} → ${template.destination} às ${template.time})`);

        // Notificar o condutor
        void this.notificationsService.createNotification(
          template.userId,
          'ride.auto-created',
          'Boleia publicada automaticamente',
          `A tua boleia ${template.origin} → ${template.destination} às ${template.time} foi publicada para hoje.`,
          { rideId: ride.id, templateId: template.id },
        );
      } catch (err) {
        this.logger.error(`[cron] Erro ao criar ride para template ${template.id}: ${err}`);
      }
    }

    this.logger.log(`[cron] generateDailyRides concluído — criadas: ${created}, ignoradas (já existiam): ${skipped}`);
  }
}
