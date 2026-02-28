import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsController } from './notifications.controller';
import { PushService } from './push.service';
import { PushController } from './push.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    ConfigModule,
    BullModule.registerQueue({ name: 'email' }),
  ],
  controllers: [NotificationsController, PushController],
  providers: [NotificationsService, NotificationsProcessor, PushService],
  exports: [NotificationsService, PushService],
})
export class NotificationsModule {}
