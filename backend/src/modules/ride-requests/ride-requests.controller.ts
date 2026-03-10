import { Controller, Post, Get, Delete, Param, Body, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RideRequestsService } from './ride-requests.service';
import { CreateRideRequestDto } from './dto/create-ride-request.dto';

@Controller('ride-requests')
@UseGuards(JwtAuthGuard)
export class RideRequestsController {
  constructor(private readonly service: RideRequestsService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateRideRequestDto) {
    return this.service.create(req.user.id, dto);
  }

  @Get()
  findAll(@Request() req) {
    return this.service.findAll(req.user.id);
  }

  @Get('for-driver')
  findForDriver(@Request() req) {
    return this.service.findForDriver(req.user.id);
  }

  @Delete(':id')
  close(@Request() req, @Param('id') id: string) {
    return this.service.close(req.user.id, id);
  }
}
