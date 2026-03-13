import { Module } from '@nestjs/common';
import { RecurringArrangementsService } from './recurring-arrangements.service';
import { RecurringArrangementsController } from './recurring-arrangements.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [RecurringArrangementsController],
  providers: [RecurringArrangementsService],
  exports: [RecurringArrangementsService],
})
export class RecurringArrangementsModule {}
