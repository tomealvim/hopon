import { Controller, Post, Delete, Body, Get, UseGuards, Req } from '@nestjs/common';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PushService } from './push.service';

class SubscribeDto {
  @IsString() endpoint: string;
  @IsString() p256dh: string;
  @IsString() auth: string;
}

class UnsubscribeDto {
  @IsString() endpoint: string;
}

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Get('vapid-key')
  getVapidKey() {
    return { publicKey: this.pushService.getPublicKey() };
  }

  @Post('subscribe')
  subscribe(@Req() req: any, @Body() dto: SubscribeDto) {
    return this.pushService.subscribe(req.user.id, dto.endpoint, dto.p256dh, dto.auth);
  }

  @Delete('unsubscribe')
  unsubscribe(@Body() dto: UnsubscribeDto) {
    return this.pushService.unsubscribe(dto.endpoint);
  }
}
