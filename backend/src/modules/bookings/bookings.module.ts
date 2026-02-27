import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { VerifiedUserGuard } from '../../common/guards/verified-user.guard';
import { InboxModule } from '../inbox/inbox.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [PrismaModule, InboxModule, EventsModule],
  controllers: [BookingsController],
  providers: [BookingsService, VerifiedUserGuard],
})
export class BookingsModule {}

