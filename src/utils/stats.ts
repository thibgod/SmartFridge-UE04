import type { Product } from '@/types/product';
import type { WasteStats } from '@/types/stats';

import { isValidPrice, toCents } from './price';
import { remainingShare } from './remaining';

/**
 * Montants d’un produit clôturé. Un produit jeté après en avoir mangé une partie
 * (« il en restait ½ ») ne compte comme perdu que pour la part restante.
 */
export function closedAmounts(product: Product): { savedCents: number; lostCents: number } {
  const cents = toCents(product.price);
  if (product.status === 'consumed') return { savedCents: cents, lostCents: 0 };
  if (product.status !== 'discarded') return { savedCents: 0, lostCents: 0 };
  const lostCents = Math.round(cents * remainingShare(product.remaining));
  return { savedCents: cents - lostCents, lostCents };
}

export function computeWasteStats(products: readonly Product[]): WasteStats {
  let consumedCount = 0;
  let discardedCount = 0;
  let savedCents = 0;
  let lostCents = 0;
  let unpricedCount = 0;

  for (const product of products) {
    if (product.status === 'active') continue;
    if (!isValidPrice(product.price)) unpricedCount += 1;

    const amounts = closedAmounts(product);
    savedCents += amounts.savedCents;
    lostCents += amounts.lostCents;
    if (product.status === 'consumed') consumedCount += 1;
    else discardedCount += 1;
  }

  const closedCount = consumedCount + discardedCount;
  return {
    consumedCount,
    discardedCount,
    closedCount,
    wasteRate: closedCount > 0 ? discardedCount / closedCount : null,
    savedCents,
    lostCents,
    unpricedCount,
  };
}

/** Historique trié du plus récent au plus ancien. */
export function selectHistory(products: readonly Product[]): Product[] {
  return products
    .filter((p) => p.status !== 'active')
    .sort((a, b) => (b.closedAt ?? b.updatedAt).localeCompare(a.closedAt ?? a.updatedAt));
}

export function formatPercent(rate: number | null): string {
  if (rate === null) return '—';
  return `${Math.round(rate * 100)} %`;
}

export type StatsPeriod = '30d' | '6m' | 'all';

const PERIOD_DAYS: Record<Exclude<StatsPeriod, 'all'>, number> = { '30d': 30, '6m': 183 };

const closedDate = (product: Product): Date => new Date(product.closedAt ?? product.updatedAt);

/** Produits clôturés pendant la période choisie (les produits actifs sont exclus). */
export function filterClosedByPeriod(products: readonly Product[], period: StatsPeriod, now: Date = new Date()): Product[] {
  const closed = products.filter((p) => p.status !== 'active');
  if (period === 'all') return closed;
  const since = now.getTime() - PERIOD_DAYS[period] * 86_400_000;
  return closed.filter((p) => closedDate(p).getTime() >= since);
}

export interface MonthBucket {
  /** AAAA-MM */
  key: string;
  /** « oct. » */
  label: string;
  /** « octobre 2026 » */
  longLabel: string;
  consumed: number;
  discarded: number;
}

const shortMonth = new Intl.DateTimeFormat('fr-FR', { month: 'short' });
const longMonth = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

/** Consommés / jetés par mois (heure locale), du plus ancien au mois en cours. */
export function monthlyBreakdown(products: readonly Product[], months = 6, now: Date = new Date()): MonthBucket[] {
  const buckets: MonthBucket[] = [];
  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.push({
      key: monthKey(date),
      label: shortMonth.format(date),
      longLabel: longMonth.format(date),
      consumed: 0,
      discarded: 0,
    });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const product of products) {
    if (product.status === 'active') continue;
    const bucket = byKey.get(monthKey(closedDate(product)));
    if (!bucket) continue;
    if (product.status === 'consumed') bucket.consumed += 1;
    else bucket.discarded += 1;
  }
  return buckets;
}

export interface CategoryWaste {
  category: Product['category'];
  count: number;
  lostCents: number;
}

/** Produits jetés par catégorie, du plus gaspillé au moins gaspillé. */
export function wasteByCategory(products: readonly Product[]): CategoryWaste[] {
  const map = new Map<Product['category'], CategoryWaste>();
  for (const product of products) {
    if (product.status !== 'discarded') continue;
    const entry = map.get(product.category) ?? { category: product.category, count: 0, lostCents: 0 };
    entry.count += 1;
    entry.lostCents += closedAmounts(product).lostCents;
    map.set(product.category, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || b.lostCents - a.lostCents);
}

export interface PeriodComparison {
  current: WasteStats;
  /** Période précédente de même durée (null pour « depuis le début »). */
  previous: WasteStats | null;
}

/** Statistiques de la période et de la période précédente, pour afficher des tendances. */
export function comparePeriods(products: readonly Product[], period: StatsPeriod, now: Date = new Date()): PeriodComparison {
  const current = computeWasteStats(filterClosedByPeriod(products, period, now));
  if (period === 'all') return { current, previous: null };
  const days = PERIOD_DAYS[period];
  const end = now.getTime() - days * 86_400_000;
  const start = end - days * 86_400_000;
  const previousItems = products.filter((p) => {
    if (p.status === 'active') return false;
    const t = closedDate(p).getTime();
    return t >= start && t < end;
  });
  return { current, previous: previousItems.length > 0 ? computeWasteStats(previousItems) : null };
}

/** Score anti-gaspi : part des produits consommés (0 à 100), null sans historique. */
export function antiWasteScore(stats: WasteStats): number | null {
  return stats.wasteRate === null ? null : Math.round((1 - stats.wasteRate) * 100);
}

export interface DiscardedName {
  name: string;
  count: number;
  category: Product['category'];
}

/** Produits le plus souvent jetés (au moins 2 fois), pour des conseils ciblés. */
export function repeatedlyDiscarded(products: readonly Product[], limit = 3): DiscardedName[] {
  const groups = new Map<string, DiscardedName>();
  for (const product of products) {
    if (product.status !== 'discarded') continue;
    const key = product.name.trim().toLowerCase();
    const group = groups.get(key) ?? { name: product.name.trim(), count: 0, category: product.category };
    group.count += 1;
    groups.set(key, group);
  }
  return [...groups.values()].filter((g) => g.count >= 2).sort((a, b) => b.count - a.count).slice(0, limit);
}

export interface MonthlyAmounts {
  key: string;
  consumedCents: number;
  discardedCents: number;
}

/** Montants consommés / jetés par mois, alignés sur monthlyBreakdown. */
export function monthlyAmounts(products: readonly Product[], months = 6, now: Date = new Date()): MonthlyAmounts[] {
  const buckets = monthlyBreakdown([], months, now).map((m) => ({ key: m.key, consumedCents: 0, discardedCents: 0 }));
  const byKey = new Map(buckets.map((b) => [b.key, b]));
  for (const product of products) {
    if (product.status === 'active') continue;
    const bucket = byKey.get(monthKey(closedDate(product)));
    if (!bucket) continue;
    const amounts = closedAmounts(product);
    bucket.consumedCents += amounts.savedCents;
    bucket.discardedCents += amounts.lostCents;
  }
  return buckets;
}
