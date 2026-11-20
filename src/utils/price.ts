export const MAX_PRICE = 10_000;

/**
 * Interprète une saisie de prix (« 2,50 », « 2.5 », « 3 € »).
 * Retourne undefined si vide, null si invalide.
 */
export function parsePriceInput(raw: string): number | undefined | null {
  const cleaned = raw.replace(/[€\s]/g, '').replace(',', '.');
  if (cleaned === '') return undefined;
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0 || value > MAX_PRICE) return null;
  return Math.round(value * 100) / 100;
}

/** Convertit un prix stocké en saisie éditable (« 2,5 » → « 2,50 »). */
export function priceToInput(price: number | undefined): string {
  return isValidPrice(price) ? price.toFixed(2).replace('.', ',') : '';
}

export function isValidPrice(price: unknown): price is number {
  return typeof price === 'number' && Number.isFinite(price) && price >= 0;
}

export function toCents(price: number | undefined): number {
  return isValidPrice(price) ? Math.round(price * 100) : 0;
}

const euroFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

export function formatEuros(amount: number): string {
  return euroFormatter.format(amount);
}

export function formatCents(cents: number): string {
  return euroFormatter.format(cents / 100);
}
