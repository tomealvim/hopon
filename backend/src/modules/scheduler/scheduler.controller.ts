import { Controller, Post, UseGuards } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('scheduler')
@UseGuards(JwtAuthGuard)
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  /** Endpoint de teste — aciona o cron manualmente (apenas autenticados) */
  @Post('trigger')
  async trigger() {
    await this.schedulerService.generateDailyRides();
    return { ok: true };
  }
}
