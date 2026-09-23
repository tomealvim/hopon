import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/impact')
  getMyImpact(@Request() req: any) {
    return this.usersService.getMyImpact(req.user.id);
  }

  @Patch('me/location')
  updateLocation(
    @Request() req: any,
    @Body() body: { lat: number; lng: number },
  ) {
    return this.usersService.updateLocation(req.user.id, body.lat, body.lng);
  }

  @Get('me/referral')
  getReferralInfo(@Request() req: any) {
    return this.usersService.getReferralInfo(req.user.id);
  }

  @Post('me/referral/apply')
  applyReferralCode(@Request() req: any, @Body() body: { code: string }) {
    return this.usersService.applyReferralCode(req.user.id, body.code);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findPublicProfile(@Param('id') id: string) {
    return this.usersService.findPublicProfile(id);
  }
}
