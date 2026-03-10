import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { RideRequestsModule } from '../ride-requests/ride-requests.module';

@Module({
  imports: [PrismaModule, NotificationsModule, GeocodingModule, RideRequestsModule],
  controllers: [SchedulerController],
  providers: [SchedulerService],
})
export class SchedulerModule {}
