import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Request() req: any, @Body() dto: CreateRatingDto) {
    return this.ratingsService.create(req.user.id, dto);
  }

  @Get('users/:userId')
  @UseGuards(JwtAuthGuard)
  getUserRatings(@Param('userId') userId: string) {
    return this.ratingsService.getUserRatings(userId);
  }
}
