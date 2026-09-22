// Dinheiro na API é sempre Int em cêntimos; a UI mostra e edita euros.

export function eurosToCents(euros: number): number {
  return Math.round(euros * 100);
}

export function centsToEuros(cents: number): number {
  return cents / 100;
}

/** Formata cêntimos como moeda pt-PT, ex.: 1250 → "12,50 €" */
export function formatCents(cents: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

/** Formata cêntimos como valor curto sem decimais, ex.: 1250 → "13" (para "€13/lugar") */
export function centsToShortEuros(cents: number): string {
  return (cents / 100).toFixed(0);
}

/** Formata cêntimos com 2 decimais sem símbolo, ex.: 1250 → "12.50" */
export function centsToFixed(cents: number): string {
  return (cents / 100).toFixed(2);
}
