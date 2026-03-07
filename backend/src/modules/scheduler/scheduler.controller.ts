import { Controller, Post, UseGuards } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('scheduler')
@UseGuards(JwtAuthGuard)
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  /** Endpoint de teste — aciona o cron de boleias manualmente (apenas autenticados) */
  @Post('trigger')
  async trigger() {
    await this.schedulerService.generateUpcomingRides();
    return { ok: true };
  }

  /** Endpoint de teste — aciona o cron de lembretes manualmente (apenas autenticados) */
  @Post('trigger-reminders')
  async triggerReminders() {
    await this.schedulerService.sendRideReminders();
    return { ok: true };
  }

  /** Endpoint de teste — aciona o cron de matching de rotas manualmente (apenas autenticados) */
  @Post('trigger-matching')
  async triggerMatching() {
    await this.schedulerService.matchUserRoutesWithTemplates();
    return { ok: true };
  }
}
