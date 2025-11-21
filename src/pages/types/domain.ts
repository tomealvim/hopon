// Tipos de domínio partilhados

export type CampusId = "all" | "ciencias" | "lusofona" | "letras" | "tecnico";

export type Role = "cliente" | "condutor";

export type FeedTopTab = "Explore" | "Following" | "ForYou";

export type BottomTab = "Home" | "Discover" | "Plus" | "Inbox" | "Profile";

export interface Post {
  id: string;
  driverName: string;
  driverRating: number;
  leavesAtMin: number;
  campusId: CampusId;
  seats: number;
  etaPickup: number;
  wait: number;
  etaDrop: number;
  walk: number;
  classMin: number;
  buffer: number;
  detourMin: number;
  detourKm: number;
  isOpen: boolean;
  seatsLeft: number;
  waitlisted: boolean;
  waitlistCount: number;
  myWaitPos: number | null;
  isFollowing: boolean;
}

export interface PassengerReq {
  id: string;
  userName: string;
  campusId: CampusId;
  classMin: number;
  buffer: number;
  zoneLabel: string;
  radius: number;
  walkMax: number;
}

export interface UserPrefs {
  originZone: string;
  campusGoal: CampusId;
  minDepartMin: number;
  maxDepartMin: number;
  maxDetourMin: number;
}
