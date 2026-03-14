import { Module } from '@nestjs/common';
import { RidesService } from './rides.service';
import { RidesController } from './rides.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { VerifiedUserGuard } from '../../common/guards/verified-user.guard';
import { WalletModule } from '../wallet/wallet.module';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { CommunitiesModule } from '../communities/communities.module';

@Module({
  imports: [PrismaModule, NotificationsModule, WalletModule, GeocodingModule, CommunitiesModule],
  controllers: [RidesController],
  providers: [RidesService, VerifiedUserGuard],
  exports: [RidesService],
})
export class RidesModule {}

