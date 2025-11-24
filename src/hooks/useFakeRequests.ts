import { useMemo, useState } from "react";
import type { PassengerReq } from "../pages/types/domain";
import { randItem } from "../utils/rand";

export function useFakeRequests() {
  const [seed, setSeed] = useState(1);

  const reqs = useMemo<PassengerReq[]>(() => {
    const arr: PassengerReq[] = [];
    for (let i = 0; i < 4; i++) {
      arr.push({
        id: `r${seed}-${i}`,
        userName: randItem(
          ["Rui", "Inês", "Marta", "Gonçalo", "Bea", "Tomás", "Sofia", "Diogo", "Carla", "João"] as const
        ),
        campusId: randItem(["ciencias", "lusofona", "letras", "tecnico"] as const),
        arrivalMin: 8 * 60 + randItem([0, 15, 30, 45] as const),
        buffer: randItem([5, 10, 15] as const),
        zoneLabel: randItem(["Estrela", "Benfica", "Alcântara", "Oeiras", "Carnide", "Campolide"] as const),
        radius: randItem([300, 400, 500] as const),
        walkMax: randItem([5, 7, 10] as const),
      });
    }
    return arr;
  }, [seed]);

  return { reqs, shuffle: () => setSeed((s) => s + 1) };
}
