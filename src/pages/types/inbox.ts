export type ThreadKind = "dm" | "ride";

export type SystemEvent =
  | { kind: "ride_request"; byUser?: string; seats?: number; when?: string; origin?: string; dest?: string; message?: string }
  | { kind: "request_accepted"; byUser?: string; seats?: number }
  | { kind: "request_declined"; byUser?: string }
  | { kind: "time_changed"; oldTime?: string; newTime?: string }
  | { kind: "meeting_changed"; oldPoint?: string; newPoint?: string }
  | { kind: "payment_due"; amount?: number }
  | { kind: "payment_paid"; amount?: number; method?: string }
  | { kind: "change_confirmed"; byUser?: string }
  | { kind: "rating_reminder"; rideId?: string }
  | { kind: "group_event"; text: string };

export type Thread = {
  id: string;
  kind: ThreadKind;
  title: string;
  participants: string[];
  unreadCount: number;
  lastEvent?: { type: "text"; text: string } | { type: "system"; system: SystemEvent };
  meta?: { date?: string };
  rideId?: string;
  isGroup?: boolean;
};

export type Message =
  | { id: string; threadId: string; type: "text"; authorId?: string; text: string; ts: number }
  | { id: string; threadId: string; type: "system"; ts: number; system: SystemEvent };
