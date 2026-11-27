/**
 * Règles de la version gratuite (voir PREMIUM.md). Fonctions pures : l’abonnement actif est
 * toujours passé en paramètre, ce qui garde ces règles testables et indépendantes du store.
 *
 * Principe : la fin d’un abonnement ne retire jamais rien. Les limites ne bloquent que les
 * nouveaux ajouts ; ce qui existe déjà reste visible et modifiable.
 */

/** Produits suivis en même temps (frigo, congélateur et placard confondus). */
export const FREE_PRODUCT_LIMIT = 30;

/** Tickets de caisse lus par mois calendaire. */
export const FREE_RECEIPTS_PER_MONTH = 3;

/** Les 15 recettes du quotidien offertes ; les 23 autres sont réservées à Premium. */
export const FREE_RECIPE_IDS: ReadonlySet<string> = new Set([
  'soupe-legumes',
  'gratin',
  'omelette',
  'smoothie',
  'riz-saute',
  'salade-composee',
  'poelee-legumes',
  'pain-perdu',
  'compote',
  'pates-creme',
  'plat-revisite',
  'croutons',
  'banana-bread',
  'crepes',
  'wraps',
]);

/** Ce qui a mené à l’offre Premium : sert à adapter son titre. */
export type PremiumReason = 'products' | 'recipes' | 'receipt' | 'widget' | 'stats' | 'settings';

export const PREMIUM_REASONS: readonly PremiumReason[] = ['products', 'recipes', 'receipt', 'widget', 'stats', 'settings'];

export function asPremiumReason(value: unknown): PremiumReason {
  return PREMIUM_REASONS.includes(value as PremiumReason) ? (value as PremiumReason) : 'settings';
}

/** Places restantes avant la limite (Infinity avec Premium). */
export function remainingProductSlots(activeCount: number, isPremium: boolean): number {
  if (isPremium) return Number.POSITIVE_INFINITY;
  return Math.max(0, FREE_PRODUCT_LIMIT - activeCount);
}

export function isRecipeLocked(recipeId: string, isPremium: boolean): boolean {
  return !isPremium && !FREE_RECIPE_IDS.has(recipeId);
}

/** « 2026-10 » : mois du compteur de tickets (heure locale). */
export function monthKey(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export interface ReceiptUsage {
  /** Mois du compteur enregistré. */
  month: string;
  count: number;
}

/** Tickets déjà lus ce mois-ci (un compteur d’un mois passé repart de zéro). */
export function receiptsUsedThisMonth(usage: ReceiptUsage | null, now: Date): number {
  return usage && usage.month === monthKey(now) ? usage.count : 0;
}

export function remainingReceipts(usage: ReceiptUsage | null, now: Date, isPremium: boolean): number {
  if (isPremium) return Number.POSITIVE_INFINITY;
  return Math.max(0, FREE_RECEIPTS_PER_MONTH - receiptsUsedThisMonth(usage, now));
}

/** Compteur après la lecture d’un ticket. */
export function recordReceipt(usage: ReceiptUsage | null, now: Date): ReceiptUsage {
  return { month: monthKey(now), count: receiptsUsedThisMonth(usage, now) + 1 };
}

/**
 * Parties du Bilan réservées à Premium. Les médailles (badges) n’en font pas partie : elles motivent
 * à ne rien jeter, elles restent offertes à tous (décision d’équipe, voir PREMIUM.md).
 */
export type StatsFeature = 'score' | 'impact' | 'charts' | 'periods' | 'export' | 'badges';

export const PREMIUM_STATS_FEATURES: ReadonlySet<StatsFeature> = new Set(['score', 'impact', 'charts', 'periods', 'export']);

export function isStatsFeatureLocked(feature: StatsFeature, isPremium: boolean): boolean {
  return !isPremium && PREMIUM_STATS_FEATURES.has(feature);
}
