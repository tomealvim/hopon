import type { Post, UserPrefs } from "../pages/types/domain";

export function computeChegasATempo({
  depMin,
  etaPickup,
  wait,
  etaDrop,
  walk,
  arrivalMin: targetArrivalMin,
  buffer,
}: {
  depMin: number;
  etaPickup: number;
  wait: number;
  etaDrop: number;
  walk: number;
  arrivalMin: number;
  buffer: number;
}) {
  const arrival = depMin + etaPickup + wait + etaDrop + walk;
  const latest = targetArrivalMin - buffer;
  const sobra = latest - arrival; // >=0 é OK
  const ok = sobra >= 0;
  return { ok, sobra, arrivalMin: arrival };
}

// “For You”: destino/horário batem e desvio baixo
export function isForYou(post: Post, prefs: UserPrefs) {
  const campusMatch = post.campusId === prefs.campusGoal;
  const timeMatch =
    post.leavesAtMin >= prefs.minDepartMin &&
    post.leavesAtMin <= prefs.maxDepartMin;
  const detourOk = post.detourMin <= prefs.maxDetourMin;
  return campusMatch && timeMatch && detourOk;
}
