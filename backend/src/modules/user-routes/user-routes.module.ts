import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { GeocodingModule } from '../geocoding/geocoding.module';
import { UserRoutesService } from './user-routes.service';
import { UserRoutesController } from './user-routes.controller';

@Module({
  imports: [PrismaModule, GeocodingModule],
  controllers: [UserRoutesController],
  providers: [UserRoutesService],
  exports: [UserRoutesService],
})
export class UserRoutesModule {}
