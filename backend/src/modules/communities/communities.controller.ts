import { Controller, Post, Get, Patch, Delete, Param, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CommunitiesService } from './communities.service';
import { CreateCommunityDto } from './dto/create-community.dto';

@Controller('communities')
@UseGuards(JwtAuthGuard)
export class CommunitiesController {
  constructor(private readonly service: CommunitiesService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateCommunityDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get('mine')
  findMine(@Request() req) {
    return this.service.findMine(req.user.id);
  }

  @Get('preview/:inviteCode')
  preview(@Param('inviteCode') inviteCode: string) {
    return this.service.findByInviteCode(inviteCode);
  }

  @Post('join/:inviteCode')
  join(@Request() req, @Param('inviteCode') inviteCode: string) {
    return this.service.join(req.user.id, inviteCode);
  }

  @Get(':id/members')
  getMembers(@Request() req, @Param('id') id: string) {
    return this.service.getMembers(req.user.id, id);
  }

  @Patch(':id/members/:userId/approve')
  approve(@Request() req, @Param('id') id: string, @Param('userId') userId: string) {
    return this.service.approveMember(req.user.id, id, userId);
  }

  @Patch(':id/members/:userId/reject')
  reject(@Request() req, @Param('id') id: string, @Param('userId') userId: string) {
    return this.service.rejectMember(req.user.id, id, userId);
  }

  @Delete(':id/members/:userId')
  removeMember(@Request() req, @Param('id') id: string, @Param('userId') userId: string) {
    return this.service.removeMember(req.user.id, id, userId);
  }

  @Delete(':id/leave')
  leave(@Request() req, @Param('id') id: string) {
    return this.service.leave(req.user.id, id);
  }

  @Post(':id/regenerate-code')
  regenerateCode(@Request() req, @Param('id') id: string) {
    return this.service.regenerateInviteCode(req.user.id, id);
  }
}
