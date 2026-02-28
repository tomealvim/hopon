import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { join } from 'path';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { RidesModule } from './modules/rides/rides.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { InboxModule } from './modules/inbox/inbox.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { EventsModule } from './modules/events/events.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AdminModule } from './modules/admin/admin.module';

// Garantir que o .env seja sempre o da pasta backend (mesmo ao correr a partir da raiz do repo)
const backendEnv = join(__dirname, '..', '.env');

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [backendEnv, '.env'],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get('REDIS_URL', 'redis://localhost:6379') },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    VehiclesModule,
    RidesModule,
    BookingsModule,
    SchedulesModule,
    InboxModule,
    RatingsModule,
    EventsModule,
    WalletModule,
    ReportsModule,
    AdminModule,
  ],
})
export class AppModule {}

