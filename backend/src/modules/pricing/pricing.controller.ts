import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PricingService } from './pricing.service';
import { CalculatePriceDto } from './dto/calculate-price.dto';

@ApiTags('pricing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('calculate')
  @ApiOperation({
    summary: 'Calcular rotas e preços reais',
    description:
      'Usa Google Maps Routes API + DGEG para retornar alternativas de rota com preço por lugar e comissão.',
  })
  async calculate(@Body() dto: CalculatePriceDto, @Request() req: any) {
    return this.pricingService.getRoutes(
      { lat: dto.originLat, lng: dto.originLng },
      { lat: dto.destLat, lng: dto.destLng },
      new Date(dto.departureTime),
      dto.vehicleId,
      dto.seats,
    );
  }

  @Post('fuel-prices')
  @ApiOperation({
    summary: 'Preços de combustível atuais (DGEG)',
    description: 'Retorna preços médios em cache (24h TTL).',
  })
  async fuelPrices() {
    return this.pricingService.getFuelPrices();
  }
}
