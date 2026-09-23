import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { InboxService } from './inbox.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('inbox')
@UseGuards(JwtAuthGuard)
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}

  @Get('conversations')
  getConversations(@Request() req: any) {
    return this.inboxService.getConversations(req.user.id);
  }

  @Get('conversations/:id/messages')
  getMessages(@Request() req: any, @Param('id') id: string) {
    return this.inboxService.getMessages(req.user.id, id);
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.inboxService.sendMessage(req.user.id, id, dto.body);
  }

  @Post('conversations/:id/read')
  markAsRead(@Request() req: any, @Param('id') id: string) {
    return this.inboxService.markAsRead(req.user.id, id);
  }

  @Get('group/:rideId')
  getGroupConversation(@Request() req: any, @Param('rideId') rideId: string) {
    return this.inboxService.getOrCreateRideGroupConversation(
      rideId,
      req.user.id,
    );
  }
}
