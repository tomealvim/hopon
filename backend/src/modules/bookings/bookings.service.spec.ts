import { getRefundFraction, calculateRefundCents } from './bookings.service';

describe('getRefundFraction', () => {
  const NOW = new Date('2026-06-15T10:00:00.000Z');

  const hoursFromNow = (hours: number): Date =>
    new Date(NOW.getTime() + hours * 3_600_000);

  describe('full refund window (more than 2h before departure)', () => {
    it('returns 1.0 well before the 2h boundary', () => {
      expect(getRefundFraction(hoursFromNow(24), NOW)).toBe(1.0);
    });

    it('returns 1.0 just above the 2h boundary', () => {
      expect(getRefundFraction(hoursFromNow(2.01), NOW)).toBe(1.0);
    });
  });

  describe('partial refund window (between 30min and 2h before departure)', () => {
    it('returns 0.5 exactly at the 2h boundary (boundary is exclusive)', () => {
      expect(getRefundFraction(hoursFromNow(2), NOW)).toBe(0.5);
    });

    it('returns 0.5 in the middle of the window', () => {
      expect(getRefundFraction(hoursFromNow(1), NOW)).toBe(0.5);
    });

    it('returns 0.5 just above the 30min boundary', () => {
      expect(getRefundFraction(hoursFromNow(0.51), NOW)).toBe(0.5);
    });
  });

  describe('no refund window (30 minutes or less before departure)', () => {
    it('returns 0.0 exactly at the 30min boundary (boundary is exclusive)', () => {
      expect(getRefundFraction(hoursFromNow(0.5), NOW)).toBe(0.0);
    });

    it('returns 0.0 just below the 30min boundary', () => {
      expect(getRefundFraction(hoursFromNow(0.49), NOW)).toBe(0.0);
    });

    it('returns 0.0 for a departure time in the past (no-show or late cancellation)', () => {
      expect(getRefundFraction(hoursFromNow(-1), NOW)).toBe(0.0);
    });

    it('returns 0.0 for a departure time exactly now', () => {
      expect(getRefundFraction(NOW, NOW)).toBe(0.0);
    });
  });

  describe('integration with cents rounding (Math.round(fullCents * fraction))', () => {
    it('produces a whole number of cents for an odd total with a 50% refund', () => {
      const fraction = getRefundFraction(hoursFromNow(1), NOW);
      const fullCents = 351;
      const refundCents = Math.round(fullCents * fraction);

      expect(refundCents).toBe(176);
    });

    it('produces an exact refund with no rounding when the fraction is 1.0', () => {
      const fraction = getRefundFraction(hoursFromNow(24), NOW);
      const fullCents = 351;
      const refundCents = Math.round(fullCents * fraction);

      expect(refundCents).toBe(351);
    });

    it('produces exactly 0 cents, not -0 or NaN, when the fraction is 0.0', () => {
      const fraction = getRefundFraction(hoursFromNow(-1), NOW);
      const fullCents = 351;
      const refundCents = Math.round(fullCents * fraction);

      expect(refundCents).toBe(0);
      expect(Object.is(refundCents, -0)).toBe(false);
    });
  });
});

describe('calculateRefundCents', () => {
  const NOW = new Date('2026-06-15T10:00:00.000Z');

  const hoursFromNow = (hours: number): Date =>
    new Date(NOW.getTime() + hours * 3_600_000);

  it('combines getRefundFraction and rounding in one call - full refund', () => {
    expect(calculateRefundCents(351, hoursFromNow(24), NOW)).toBe(351);
  });

  it('combines getRefundFraction and rounding in one call - partial refund with odd cents', () => {
    expect(calculateRefundCents(351, hoursFromNow(1), NOW)).toBe(176);
  });

  it('combines getRefundFraction and rounding in one call - no refund', () => {
    expect(calculateRefundCents(351, hoursFromNow(-1), NOW)).toBe(0);
  });

  it('defaults now to the current time when not provided', () => {
    const farFuture = new Date(Date.now() + 100 * 3_600_000);
    expect(calculateRefundCents(351, farFuture)).toBe(351);
  });
});
