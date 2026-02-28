import { Module } from '@nestjs/common';
import { RidesService } from './rides.service';
import { RidesController } from './rides.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { VerifiedUserGuard } from '../../common/guards/verified-user.guard';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [PrismaModule, NotificationsModule, WalletModule],
  controllers: [RidesController],
  providers: [RidesService, VerifiedUserGuard],
  exports: [RidesService],
})
export class RidesModule {}

