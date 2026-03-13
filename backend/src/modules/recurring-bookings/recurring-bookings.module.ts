import { Module } from '@nestjs/common';
import { RecurringBookingsController } from './recurring-bookings.controller';
import { RecurringBookingsService } from './recurring-bookings.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RecurringBookingsController],
  providers: [RecurringBookingsService],
  exports: [RecurringBookingsService],
})
export class RecurringBookingsModule {}
