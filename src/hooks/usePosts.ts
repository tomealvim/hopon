import { useCallback, useState } from "react";
import type { Post } from "../pages/types/domain";
import { randItem } from "../utils/rand";

// gerador fake para cards de condutores
function generatePost(seed: number): Post {
  const leavesAtMin = 7 * 60 + 10 + Math.floor(Math.random() * 50); // 07:10–08:00
  const arrivalMin = 8 * 60 + 15; // 08:15
  const buffer = randItem([5, 10, 15] as const);
  const etaPickup = 5 + Math.floor(Math.random() * 7); // 5–11
  const wait = 2 + Math.floor(Math.random() * 2); // 2–3
  const etaDrop = 10 + Math.floor(Math.random() * 10); // 10–19
  const walk = randItem([3, 4, 5, 6, 7] as const);
  const detourMin = 1 + Math.floor(Math.random() * 8); // 1–8
  const detourKm = 0.3 + Math.random() * 2.0; // 0.3–2.3
  const seats = randItem([1, 2, 3] as const);
  const seatsLeft = Math.max(0, seats - randItem([0, 0, 0, 1] as const)); // maioria com lugares
  const waitlistCount = seatsLeft === 0 ? Math.floor(Math.random() * 4) : 0; // 0–3
  const campusId = randItem(["ciencias", "lusofona", "letras", "tecnico"] as const);

  return {
    id: `p${seed}-${Math.random().toString(36).slice(2, 7)}`,
    driverName: randItem(
      ["Rui", "Inês", "Marta", "Gonçalo", "Bea", "Tomás", "Sofia", "Diogo", "Carla", "João"] as const
    ),
    driverRating: 3.8 + Math.random() * 1.2,
    leavesAtMin,
    campusId,
    seats,
    etaPickup,
    wait,
    etaDrop,
    walk,
    arrivalMin,
    buffer,
    detourMin,
    detourKm,
    isOpen: true,
    seatsLeft,
    waitlisted: false,
    waitlistCount,
    myWaitPos: null,
    isFollowing: Math.random() < 0.25,
  };
}

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>(
    () => Array.from({ length: 12 }, (_, i) => generatePost(i + 1))
  );

  const decrementSeat = useCallback((id: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id !== id ? p : { ...p, seatsLeft: Math.max(0, (p.seatsLeft || 0) - 1) }
      )
    );
  }, []);

  const markWaitlist = useCallback((id: string) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const nextPos = (p.waitlistCount ?? 0) + 1;
        return { ...p, waitlisted: true, waitlistCount: nextPos, myWaitPos: nextPos };
      })
    );
  }, []);

  return { posts, decrementSeat, markWaitlist };
}
