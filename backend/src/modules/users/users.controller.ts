import { Controller, Get, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/impact')
  getMyImpact(@Request() req: any) {
    return this.usersService.getMyImpact(req.user.userId);
  }

  @Patch('me/location')
  updateLocation(@Request() req: any, @Body() body: { lat: number; lng: number }) {
    return this.usersService.updateLocation(req.user.userId, body.lat, body.lng);
  }

  @Get(':id')
  findPublicProfile(@Param('id') id: string) {
    return this.usersService.findPublicProfile(id);
  }
}

