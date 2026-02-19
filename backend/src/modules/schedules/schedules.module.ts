import { Module } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { VerifiedUserGuard } from '../../common/guards/verified-user.guard';

@Module({
  imports: [PrismaModule],
  controllers: [SchedulesController],
  providers: [SchedulesService, VerifiedUserGuard],
  exports: [SchedulesService],
})
export class SchedulesModule {}
