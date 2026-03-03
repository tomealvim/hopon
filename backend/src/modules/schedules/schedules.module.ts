import { Module } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { VerifiedUserGuard } from '../../common/guards/verified-user.guard';
import { GeocodingModule } from '../geocoding/geocoding.module';

@Module({
  imports: [PrismaModule, GeocodingModule],
  controllers: [SchedulesController],
  providers: [SchedulesService, VerifiedUserGuard],
  exports: [SchedulesService],
})
export class SchedulesModule {}
