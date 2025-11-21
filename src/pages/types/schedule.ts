export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type ClassSlot = {
  day: Weekday;
  start: string;      // "08:30"
  end?: string;       // opcional
  campus: string;     // ex.: "ULisboa Ciências"
  originHint?: string;
};

export type UserSchedule = {
  timezone?: string;        // "Europe/Lisbon"
  defaultOrigin?: string;   // "Cascais"
  commuteWindowMin?: number; // tolerância ± min (default 10)
  slots: ClassSlot[];
};

export type RideNeed = {
  id: string;
  day: Weekday;
  when: string;          // "08:05"
  origin: string;
  destination: string;
  toleranceMin: number;
};
