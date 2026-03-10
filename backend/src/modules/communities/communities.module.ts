import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommunitiesService } from './communities.service';
import { CommunitiesController } from './communities.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CommunitiesController],
  providers: [CommunitiesService],
  exports: [CommunitiesService],
})
export class CommunitiesModule {}
