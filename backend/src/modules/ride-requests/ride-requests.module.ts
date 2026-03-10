import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { RideRequestsService } from './ride-requests.service';
import { RideRequestsController } from './ride-requests.controller';

@Module({
  imports: [PrismaModule, GeocodingModule],
  controllers: [RideRequestsController],
  providers: [RideRequestsService],
  exports: [RideRequestsService],
})
export class RideRequestsModule {}
