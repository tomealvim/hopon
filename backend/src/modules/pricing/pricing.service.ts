import {
  Injectable,
  NotFoundException,
  BadGatewayException,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface PriceBreakdown {
  distanceKm: number;
  durationMin: number;
  fuelCost: number;
  tollCost: number;
  pricePerSeat: number;
  platformFee: number;
  passengerPays: number;
  driverReceives: number;
  suggestedMaxPrice: number;
}

export interface RouteOption {
  routeId: string;
  label: string;
  distanceKm: number;
  durationMin: number;
  tollCost: number;
  breakdown: PriceBreakdown;
  polyline: string;
}

// Consumo médio por defeito por tipo de combustível (L/100km ou kWh/100km)
const DEFAULT_CONSUMPTION: Record<string, number> = {
  gasolina95: 7.5,
  gasoleo: 6.0,
  gpl: 10.0,
  eletrico: 18.0,
  hibrido: 5.5,
};

// Preço de fallback por tipo de combustível (€/L ou €/kWh) — atualizado manualmente
const FALLBACK_FUEL_PRICES: Record<string, number> = {
  gasolina95: 1.72,
  gasoleo: 1.59,
  gpl: 0.85,
  eletrico: 0.22,
  hibrido: 1.72,
};

const DGEG_API_URL =
  'https://precoscombustiveis.dgeg.gov.pt/api/PrecoComb/ListarCombustiveis';
const FUEL_CACHE_KEY = 'pricing:dgeg:fuel-prices';
const FUEL_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // ─── Preços de combustível DGEG ─────────────────────────────────────────────

  async getFuelPrices(): Promise<Record<string, number>> {
    const cached = await this.cache.get<Record<string, number>>(FUEL_CACHE_KEY);
    if (cached) return cached;

    try {
      const response = await fetch(DGEG_API_URL, {
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        throw new Error(`DGEG responded with ${response.status}`);
      }

      const data: any = await response.json();
      const prices = this.parseDgegPrices(data);

      await this.cache.set(FUEL_CACHE_KEY, prices, FUEL_CACHE_TTL_MS);
      return prices;
    } catch (err) {
      this.logger.warn(`DGEG API unavailable, using fallback prices: ${err}`);
      return FALLBACK_FUEL_PRICES;
    }
  }

  private parseDgegPrices(data: any): Record<string, number> {
    // A API DGEG retorna lista de combustíveis com preço médio
    // Estrutura: { resultado: [{ tipo: string, precoMedio: number, ... }] }
    const prices: Record<string, number> = { ...FALLBACK_FUEL_PRICES };

    const items: any[] = data?.resultado ?? data?.data ?? [];
    for (const item of items) {
      const tipo = (item.tipo ?? item.tipoCombustivel ?? '').toLowerCase();
      const preco = parseFloat(item.precoMedio ?? item.preco ?? 0);
      if (!preco || isNaN(preco)) continue;

      if (tipo.includes('gasolina') && tipo.includes('95')) {
        prices.gasolina95 = preco;
        prices.hibrido = preco; // híbrido usa gasolina como referência
      } else if (tipo.includes('gasóleo') || tipo.includes('gasoleo')) {
        prices.gasoleo = preco;
      } else if (tipo.includes('gpl') || tipo.includes('gás')) {
        prices.gpl = preco;
      } else if (tipo.includes('elétr') || tipo.includes('eletr')) {
        prices.eletrico = preco;
      }
    }

    return prices;
  }

  // ─── Google Maps Routes API ──────────────────────────────────────────────────

  async getRoutes(
    origin: LatLng,
    dest: LatLng,
    departureTime: Date,
    vehicleId: string,
    seats: number,
  ): Promise<RouteOption[]> {
    const apiKey = this.config.get<string>('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      throw new BadGatewayException('GOOGLE_MAPS_API_KEY não configurada');
    }

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException('Veículo não encontrado');
    }

    const fuelPrices = await this.getFuelPrices();

    const body = {
      origin: {
        location: { latLng: { latitude: origin.lat, longitude: origin.lng } },
      },
      destination: {
        location: { latLng: { latitude: dest.lat, longitude: dest.lng } },
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      departureTime: departureTime.toISOString(),
      computeAlternativeRoutes: true,
      extraComputations: ['TOLLS'],
      routeModifiers: {
        vehicleInfo: { emissionType: 'GASOLINE' },
        tollPasses: [],
      },
      languageCode: 'pt-PT',
      units: 'METRIC',
    };

    let routesData: any;
    try {
      const response = await fetch(
        'https://routes.googleapis.com/directions/v2:computeRoutes',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask':
              'routes.distanceMeters,routes.duration,routes.polyline,routes.travelAdvisory.tollInfo,routes.description,routes.labels',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15000),
        },
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Google Routes API: ${response.status} — ${errText}`);
      }

      routesData = await response.json();
    } catch (err) {
      throw new BadGatewayException(`Erro ao calcular rota: ${err}`);
    }

    const routes: any[] = routesData.routes ?? [];
    if (routes.length === 0) {
      throw new BadGatewayException('Nenhuma rota encontrada');
    }

    const routeLabels = ['Recomendada', 'Alternativa 1', 'Alternativa 2'];

    return routes.slice(0, 3).map((route, idx) => {
      const distanceKm = (route.distanceMeters ?? 0) / 1000;
      const durationSec = parseInt(
        (route.duration ?? '0s').replace('s', ''),
        10,
      );
      const durationMin = Math.round(durationSec / 60);

      // Extrair custo de portagens — API retorna em mikro-unidades ou object
      const tollInfo = route.travelAdvisory?.tollInfo;
      let tollCost = 0;
      if (tollInfo?.estimatedPrice) {
        const priceEntry = tollInfo.estimatedPrice.find(
          (p: any) => p.currencyCode === 'EUR',
        );
        if (priceEntry) {
          tollCost = parseFloat(
            priceEntry.units != null ? priceEntry.units : (priceEntry.nanos / 1e9 || 0),
          );
        }
      }

      const label =
        route.description ??
        (route.labels?.includes('FUEL_EFFICIENT')
          ? 'Mais eficiente'
          : routeLabels[idx] ?? `Rota ${idx + 1}`);

      const breakdown = this.calculatePrice(
        distanceKm,
        durationMin,
        tollCost,
        vehicle,
        fuelPrices,
        seats,
      );

      return {
        routeId: `route_${idx}`,
        label,
        distanceKm: Math.round(distanceKm * 10) / 10,
        durationMin,
        tollCost: Math.round(tollCost * 100) / 100,
        breakdown,
        polyline: route.polyline?.encodedPolyline ?? '',
      };
    });
  }

  // ─── Cálculo de preço ────────────────────────────────────────────────────────

  calculatePrice(
    distanceKm: number,
    durationMin: number,
    tollCost: number,
    vehicle: { fuelType?: string | null; avgConsumption?: number | null },
    fuelPrices: Record<string, number>,
    seats: number,
  ): PriceBreakdown {
    const fuelType = vehicle.fuelType ?? 'gasolina95';
    const consumption =
      vehicle.avgConsumption ?? DEFAULT_CONSUMPTION[fuelType] ?? 7.5;
    const fuelPrice = fuelPrices[fuelType] ?? FALLBACK_FUEL_PRICES[fuelType] ?? 1.72;

    // Custo de combustível total para a viagem
    const fuelCost = (distanceKm * consumption * fuelPrice) / 100;

    // Dividir custos pelos passageiros (seats = lugares vendidos)
    const safeSeats = Math.max(seats, 1);
    const pricePerSeat = (fuelCost + tollCost) / safeSeats;

    // Comissão HopOn: 10% sobre o preço por lugar
    const platformFee = pricePerSeat * 0.1;
    const passengerPays = pricePerSeat + platformFee;
    const driverReceives = pricePerSeat;

    // Teto: preço base + 20%
    const suggestedMaxPrice = pricePerSeat * 1.2;

    return {
      distanceKm: Math.round(distanceKm * 10) / 10,
      durationMin,
      fuelCost: Math.round(fuelCost * 100) / 100,
      tollCost: Math.round(tollCost * 100) / 100,
      pricePerSeat: Math.round(pricePerSeat * 100) / 100,
      platformFee: Math.round(platformFee * 100) / 100,
      passengerPays: Math.round(passengerPays * 100) / 100,
      driverReceives: Math.round(driverReceives * 100) / 100,
      suggestedMaxPrice: Math.round(suggestedMaxPrice * 100) / 100,
    };
  }
}
