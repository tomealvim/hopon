import type { DaySchedule, TimeBlock, UserSchedule } from "../pages/types/user";

export type ScheduleEntry = {
  day: DaySchedule["day"];
  block: TimeBlock;
};

export const WEEK_DAY_META: Array<{ key: DaySchedule["day"]; label: string; short: string }> = [
  { key: "segunda", label: "Segunda", short: "Seg" },
  { key: "terca", label: "Terça", short: "Ter" },
  { key: "quarta", label: "Quarta", short: "Qua" },
  { key: "quinta", label: "Quinta", short: "Qui" },
  { key: "sexta", label: "Sexta", short: "Sex" },
  { key: "sabado", label: "Sábado", short: "Sáb" },
];

export const WEEK_DAY_ORDER: Record<DaySchedule["day"], number> = WEEK_DAY_META.reduce(
  (acc, day, index) => {
    acc[day.key] = index;
    return acc;
  },
  {} as Record<DaySchedule["day"], number>,
);

const JS_DAY_TO_KEY: Record<number, DaySchedule["day"]> = {
  0: "segunda",
  1: "segunda",
  2: "terca",
  3: "quarta",
  4: "quinta",
  5: "sexta",
  6: "sabado",
};

export function getTodayKey(date: Date = new Date()): DaySchedule["day"] {
  return JS_DAY_TO_KEY[date.getDay()] ?? "segunda";
}

export function getDayLabel(day: DaySchedule["day"], variant: "short" | "full" = "full"): string {
  const meta = WEEK_DAY_META.find(item => item.key === day);
  if (!meta) return day;
  return variant === "short" ? meta.short : meta.label;
}

export function normalizeUserSchedule(schedule: UserSchedule): UserSchedule {
  const buckets: Record<DaySchedule["day"], TimeBlock[]> = {
    segunda: [],
    terca: [],
    quarta: [],
    quinta: [],
    sexta: [],
    sabado: [],
  };

  schedule.days.forEach(day => {
    const normalizedDay = normalizeDayKey(day.day);
    if (!normalizedDay) return;

    day.blocks.forEach((block, index) => {
      const normalizedBlock = normalizeBlock(block, normalizedDay, index);
      if (normalizedBlock) {
        buckets[normalizedDay].push(normalizedBlock);
      }
    });
  });

  const normalizedDays = WEEK_DAY_META.map(({ key }) => ({
    day: key,
    blocks: buckets[key].sort((a, b) => a.start.localeCompare(b.start)),
  })).filter(day => day.blocks.length > 0);

  return { days: normalizedDays };
}

export function flattenSchedule(schedule: UserSchedule, assumeNormalized = false): ScheduleEntry[] {
  const source = assumeNormalized ? schedule : normalizeUserSchedule(schedule);
  const entries: ScheduleEntry[] = [];
  source.days.forEach(day => {
    day.blocks.forEach(block => {
      entries.push({ day: day.day, block });
    });
  });
  return entries;
}

export function sortEntriesByUpcoming(
  entries: ScheduleEntry[],
  referenceDate: Date = new Date(),
): ScheduleEntry[] {
  const referenceDay = getTodayKey(referenceDate);
  const referenceIndex = WEEK_DAY_ORDER[referenceDay];
  const dayCount = WEEK_DAY_META.length;

  return [...entries].sort((a, b) => {
    const rankA = getUpcomingRank(a, referenceIndex, dayCount);
    const rankB = getUpcomingRank(b, referenceIndex, dayCount);
    if (rankA !== rankB) return rankA - rankB;
    return a.block.start.localeCompare(b.block.start);
  });
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getUpcomingRank(entry: ScheduleEntry, referenceIndex: number, dayCount: number): number {
  const dayIndex = WEEK_DAY_ORDER[entry.day];
  const dayOffset = (dayIndex - referenceIndex + dayCount) % dayCount;
  return dayOffset * 24 * 60 + timeToMinutes(entry.block.start);
}

function normalizeDayKey(value: string): DaySchedule["day"] | null {
  if (!value) return null;
  const safe = stripAccents(value).toLowerCase().replace(/[^a-z]/g, "");
  if (safe.startsWith("seg")) return "segunda";
  if (safe.startsWith("ter")) return "terca";
  if (safe.startsWith("quar")) return "quarta";
  if (safe.startsWith("qui")) return "quinta";
  if (safe.startsWith("sex")) return "sexta";
  if (safe.startsWith("sab") || safe.startsWith("sáb")) return "sabado";
  if (safe.startsWith("mon")) return "segunda";
  if (safe.startsWith("tue")) return "terca";
  if (safe.startsWith("wed")) return "quarta";
  if (safe.startsWith("thu")) return "quinta";
  if (safe.startsWith("fri")) return "sexta";
  if (safe.startsWith("sat")) return "sabado";
  return null;
}

function normalizeTime(value?: string): string | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Math.min(Math.max(parseInt(match[1], 10), 0), 23);
  const minutes = Math.min(Math.max(parseInt(match[2], 10), 0), 59);
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

function normalizeBlock(block: TimeBlock, day: DaySchedule["day"], index: number): TimeBlock | null {
  const start = normalizeTime(block.start);
  const end = normalizeTime(block.end);
  if (!start || !end) return null;
  if (start >= end) return null;

  const normalized: TimeBlock = {
    id: block.id || `${day}-${index}-${start.replace(":", "")}-${end.replace(":", "")}`,
    start,
    end,
    title: block.title?.trim() || undefined,
    room: block.room?.trim() || undefined,
  };
  return normalized;
}

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

