import { PricingService } from './pricing.service';

// calculatePrice não usa this.prisma, this.config nem this.cache — é síncrono e
// sem I/O. Passamos objetos vazios ao construtor só para satisfazer o tipo;
// nunca são chamados nestes testes.
describe('PricingService.calculatePrice', () => {
  let service: PricingService;

  beforeEach(() => {
    service = new PricingService({} as any, {} as any, {} as any);
  });

  describe('normal cases', () => {
    it('calculates fuel cost, platform fee and driver payout for a diesel car', () => {
      const result = service.calculatePrice(
        20,
        25,
        0,
        { fuelType: 'gasoleo', avgConsumption: 6.0 },
        { gasoleo: 1.59 },
        1,
      );

      expect(result.fuelCostCents).toBe(191);
      expect(result.tollCostCents).toBe(0);
      expect(result.pricePerSeatCents).toBe(191);
      expect(result.platformFeeCents).toBe(19);
      expect(result.passengerPaysCents).toBe(210);
      expect(result.driverReceivesCents).toBe(191);
      expect(result.suggestedMaxPriceCents).toBe(229);
    });

    it('includes toll cost in the amount split between seats', () => {
      const result = service.calculatePrice(
        20,
        25,
        2.5,
        { fuelType: 'gasoleo', avgConsumption: 6.0 },
        { gasoleo: 1.59 },
        1,
      );

      expect(result.tollCostCents).toBe(250);
      expect(result.pricePerSeatCents).toBe(441);
    });

    it('splits fuel and toll cost across multiple seats', () => {
      const result = service.calculatePrice(
        20,
        25,
        2.5,
        { fuelType: 'gasoleo', avgConsumption: 6.0 },
        { gasoleo: 1.59 },
        3,
      );

      expect(result.pricePerSeatCents).toBe(147);
    });

    it('keeps the passenger-pays / driver-receives relationship consistent', () => {
      const result = service.calculatePrice(
        35,
        40,
        1.2,
        { fuelType: 'gasolina95', avgConsumption: 7.5 },
        { gasolina95: 1.72 },
        2,
      );

      expect(result.passengerPaysCents).toBe(
        result.driverReceivesCents + result.platformFeeCents,
      );
      expect(result.driverReceivesCents).toBe(result.pricePerSeatCents);
    });
  });

  describe('fallbacks', () => {
    it('falls back to gasolina95 defaults when fuelType is missing', () => {
      const result = service.calculatePrice(
        20,
        25,
        0,
        { fuelType: null, avgConsumption: null },
        {},
        1,
      );

      expect(result.fuelCostCents).toBe(258);
    });

    it('uses the vehicle-specific consumption when provided, ignoring the fuel-type default', () => {
      const result = service.calculatePrice(
        20,
        25,
        0,
        { fuelType: 'gasoleo', avgConsumption: 4.2 },
        { gasoleo: 1.59 },
        1,
      );

      expect(result.fuelCostCents).toBe(134);
    });
  });

  describe('boundary and edge cases', () => {
    it('does not divide by zero when seats is 0 - currently treated as 1 seat', () => {
      const zeroSeats = service.calculatePrice(
        20,
        25,
        0,
        { fuelType: 'gasoleo', avgConsumption: 6.0 },
        { gasoleo: 1.59 },
        0,
      );
      const oneSeat = service.calculatePrice(
        20,
        25,
        0,
        { fuelType: 'gasoleo', avgConsumption: 6.0 },
        { gasoleo: 1.59 },
        1,
      );

      expect(zeroSeats.pricePerSeatCents).toBe(oneSeat.pricePerSeatCents);
      expect(Number.isFinite(zeroSeats.pricePerSeatCents)).toBe(true);
    });

    it('returns 0 cents for a zero-distance ride with no tolls', () => {
      const result = service.calculatePrice(
        0,
        0,
        0,
        { fuelType: 'gasoleo', avgConsumption: 6.0 },
        { gasoleo: 1.59 },
        1,
      );

      expect(result.fuelCostCents).toBe(0);
      expect(result.pricePerSeatCents).toBe(0);
      expect(result.platformFeeCents).toBe(0);
      expect(result.passengerPaysCents).toBe(0);
    });

    it('rounds distanceKm in the output to one decimal place without affecting the cost calculation', () => {
      const result = service.calculatePrice(
        20.37,
        25,
        0,
        { fuelType: 'gasoleo', avgConsumption: 6.0 },
        { gasoleo: 1.59 },
        1,
      );

      expect(result.distanceKm).toBe(20.4);
      expect(result.fuelCostCents).toBe(194);
    });
  });
});
