import { Controller, Post, Delete, Body, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PushService } from './push.service';

class SubscribeDto {
  endpoint: string;
  p256dh: string;
  auth: string;
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
  unsubscribe(@Body() dto: { endpoint: string }) {
    return this.pushService.unsubscribe(dto.endpoint);
  }
}
