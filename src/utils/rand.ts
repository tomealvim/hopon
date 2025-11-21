// utilitários simples de aleatoriedade

export const randItem = <T,>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];