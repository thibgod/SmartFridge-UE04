/** Part restante valide : strictement entre 0 et 1 (un produit fini est « consommé », un entier n’a pas de valeur). */
export const isValidRemaining = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 1;

/** Part réellement mangée ou jetée selon la clôture : un fond jeté ne compte que pour ce qu’il en restait. */
export function remainingShare(remaining: number | undefined): number {
  return isValidRemaining(remaining) ? remaining : 1;
}

/** « ¾ », « ½ », « ¼ », sinon pourcentage. */
export function formatRemaining(remaining: number): string {
  const fractions: Record<string, string> = { '0.75': '¾', '0.5': '½', '0.25': '¼' };
  return fractions[String(Math.round(remaining * 100) / 100)] ?? `${Math.round(remaining * 100)} %`;
}

export const REMAINING_OPTIONS = [0.75, 0.5, 0.25] as const;
