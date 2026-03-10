import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { createKeyv } from '@keyv/redis';
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
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { StripeModule } from './modules/stripe/stripe.module';
import { DisputesModule } from './modules/disputes/disputes.module';
import { UserRoutesModule } from './modules/user-routes/user-routes.module';
import { RideRequestsModule } from './modules/ride-requests/ride-requests.module';
import { CommunitiesModule } from './modules/communities/communities.module';

// Garantir que o .env seja sempre o da pasta backend (mesmo ao correr a partir da raiz do repo)
const backendEnv = join(__dirname, '..', '.env');

@Module({
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
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
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        stores: [
          createKeyv(config.get('REDIS_URL', 'redis://localhost:6379')),
        ],
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 300,  // 300 req/min por IP (5/s) — protege contra abuso sem bloquear testes
      },
    ]),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
          : undefined,
        redact: ['req.headers.authorization'], // não logar tokens JWT
      },
    }),
    ScheduleModule.forRoot(),
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
    SchedulerModule,
    PricingModule,
    StripeModule,
    DisputesModule,
    UserRoutesModule,
    RideRequestsModule,
    CommunitiesModule,
  ],
})
export class AppModule {}

