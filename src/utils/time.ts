// Utilitário de formatação de tempo

/** Converte minutos absolutos em "HH:MM" (zero à esquerda). */
export function minutesToHHMM(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}