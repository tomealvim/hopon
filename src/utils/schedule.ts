import type { UserSchedule, RideNeed, ClassSlot } from "../pages/types/schedule";

export function needsFromSchedule(s: UserSchedule): RideNeed[] {
  const tol = s.commuteWindowMin ?? 10;
  const originDefault = s.defaultOrigin ?? "Cascais";
  return s.slots.map((slot: ClassSlot, i: number) => {
    const when = minusMinutes(slot.start, 25); // heurística rápida
    return {
      id: `need-${i}`,
      day: slot.day,
      when,
      origin: slot.originHint ?? originDefault,
      destination: slot.campus,
      toleranceMin: tol,
    };
  });
}

export function scoreRideAgainstNeed(ride: {
  departTime: string;
  origin: string;
  destination: string;
  durationMin?: number;
  seats?: number;
  verified?: boolean;
}, need: RideNeed): number {
  let score = 0;
  const dt = timeDiffMin(ride.departTime, need.when);
  if (Math.abs(dt) <= need.toleranceMin) score += 50 - Math.abs(dt);
  if (cmpLoose(ride.origin, need.origin)) score += 20;
  if (cmpLoose(ride.destination, need.destination)) score += 20;
  if (ride.seats && ride.seats >= 1) score += 5;
  if (ride.verified) score += 5;
  return score;
}

// utils locais
function minusMinutes(hhmm: string, m: number) {
  const [h, mm] = hhmm.split(":").map(Number);
  const total = h * 60 + mm - m;
  const H = ((Math.floor(total / 60) % 24) + 24) % 24;
  const M = ((total % 60) + 60) % 60;
  return `${String(H).padStart(2, "0")}:${String(M).padStart(2, "0")}`;
}
function timeDiffMin(a: string, b: string) {
  const [h1, m1] = a.split(":").map(Number);
  const [h2, m2] = b.split(":").map(Number);
  return (h1 * 60 + m1) - (h2 * 60 + m2);
}
function cmpLoose(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
