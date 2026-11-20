import type { LocationFilter, Product } from '@/types/product';

import { daysBetween, daysUntil, toLocalDateString } from './date';
import { isValidPrice } from './price';
import { DEFAULT_URGENT_THRESHOLD, getExpiryLevel, type ExpiryLevel } from './expiry';
import { significantHead } from './foodName';
import { normalizeText } from './text';

/** Tri par date de péremption croissante, puis par nom pour un ordre stable. */
export function sortByExpiry(products: readonly Product[]): Product[] {
  return [...products].sort((a, b) => a.expiresAt.localeCompare(b.expiresAt) || a.name.localeCompare(b.name, 'fr'));
}

export function filterByLocation(products: readonly Product[], filter: LocationFilter): Product[] {
  return filter === 'all' ? [...products] : products.filter((p) => p.location === filter);
}

/** Recherche insensible à la casse et aux accents sur le nom, la marque et le code-barres. */
export function searchProducts(products: readonly Product[], query: string): Product[] {
  const needle = normalizeText(query);
  if (!needle) return [...products];
  return products.filter((p) => [p.name, p.brand ?? '', p.barcode ?? ''].some((field) => normalizeText(field).includes(needle)));
}

export function selectInventory(products: readonly Product[], filter: LocationFilter, query: string): Product[] {
  return sortByExpiry(searchProducts(filterByLocation(products, filter), query));
}

export interface UrgencySummary {
  /** Produits qui périment aujourd’hui ou dans le seuil d’urgence. */
  soonCount: number;
  expiredCount: number;
}

export function summarizeUrgency(
  products: readonly Product[],
  now: Date = new Date(),
  threshold: number = DEFAULT_URGENT_THRESHOLD,
): UrgencySummary {
  let soonCount = 0;
  let expiredCount = 0;
  for (const product of products) {
    const level = getExpiryLevel(daysUntil(product.expiresAt, now), threshold);
    if (level === 'expired') expiredCount += 1;
    else if (level === 'urgent') soonCount += 1;
  }
  return { soonCount, expiredCount };
}

export interface InventorySection {
  level: ExpiryLevel;
  data: Product[];
}

const SECTION_ORDER: readonly ExpiryLevel[] = ['expired', 'urgent', 'ok'];

/** Regroupe une liste déjà triée en sections Périmés / À consommer vite / Plus tard. */
export function groupByUrgency(
  products: readonly Product[],
  now: Date = new Date(),
  threshold: number = DEFAULT_URGENT_THRESHOLD,
): InventorySection[] {
  const buckets: Record<ExpiryLevel, Product[]> = { expired: [], urgent: [], ok: [] };
  for (const product of products) {
    buckets[getExpiryLevel(daysUntil(product.expiresAt, now), threshold)].push(product);
  }
  return SECTION_ORDER.filter((level) => buckets[level].length > 0).map((level) => ({ level, data: buckets[level] }));
}

export interface FrequentProduct {
  /** Dernière occurrence, utilisée pour préremplir le formulaire. */
  latest: Product;
  count: number;
}

/**
 * Produits achetés le plus souvent (actifs et historique confondus), pour l’ajout express.
 * Regroupement par nom normalisé ; à fréquence égale, le plus récent d’abord.
 */
export function frequentProducts(products: readonly Product[], limit = 8): FrequentProduct[] {
  const groups = new Map<string, FrequentProduct>();
  for (const product of products) {
    const key = normalizeText(product.name);
    if (!key) continue;
    const group = groups.get(key);
    if (!group) groups.set(key, { latest: product, count: 1 });
    else {
      group.count += 1;
      if (product.addedAt > group.latest.addedAt) group.latest = product;
    }
  }
  return [...groups.values()]
    .sort((a, b) => b.count - a.count || b.latest.addedAt.localeCompare(a.latest.addedAt))
    .slice(0, limit);
}

export type UrgencyFilter = 'all' | ExpiryLevel;

export function filterByUrgency(
  products: readonly Product[],
  filter: UrgencyFilter,
  now: Date = new Date(),
  threshold: number = DEFAULT_URGENT_THRESHOLD,
): Product[] {
  if (filter === 'all') return [...products];
  return products.filter((p) => getExpiryLevel(daysUntil(p.expiresAt, now), threshold) === filter);
}

/**
 * Produit actif qui ressemble au nom saisi (même nom, ou même aliment principal :
 * « Yaourts » ↔ « Yaourt nature bio »), pour prévenir d’un achat en double.
 */
export function findSimilarActive(products: readonly Product[], name: string, excludeId?: string): Product | undefined {
  const key = normalizeText(name);
  if (key.length < 3) return undefined;
  const head = significantHead(name).join(' ');
  const active = products.filter((p) => p.status === 'active' && p.id !== excludeId);
  return (
    active.find((p) => normalizeText(p.name) === key) ??
    (head ? active.find((p) => significantHead(p.name).join(' ') === head) : undefined)
  );
}

/**
 * Durée de conservation habituelle d’un produit déjà acheté (même nom, même emplacement) :
 * médiane des écarts « ajout → péremption » des achats précédents. null s’il n’y en a pas.
 */
export function learnedShelfLifeDays(
  products: readonly Product[],
  name: string,
  location: Product['location'],
): { days: number; count: number } | null {
  const key = normalizeText(name);
  if (key.length < 3) return null;
  const spans = products
    .filter((p) => p.location === location && normalizeText(p.name) === key && !p.openedAt)
    .map((p) => daysBetween(toLocalDateString(new Date(p.addedAt)), p.expiresAt))
    .filter((days) => days >= 0 && days <= 365 * 3)
    .sort((a, b) => a - b);
  if (spans.length === 0) return null;
  const mid = Math.floor(spans.length / 2);
  const days = spans.length % 2 ? (spans[mid] as number) : Math.round(((spans[mid - 1] as number) + (spans[mid] as number)) / 2);
  return { days, count: spans.length };
}

export interface PurchaseHistory {
  count: number;
  /** Prix moyen (euros) des achats où il est renseigné. */
  averagePrice?: number;
  /** Nombre d’achats avec un prix renseigné. */
  pricedCount: number;
  lastAddedAt: string;
  discarded: number;
  consumed: number;
}

/** Historique d’achat d’un produit (même nom normalisé), tous statuts confondus. */
export function purchaseHistory(products: readonly Product[], name: string): PurchaseHistory | null {
  const key = normalizeText(name);
  if (key.length < 3) return null;
  const same = products.filter((p) => normalizeText(p.name) === key);
  if (same.length === 0) return null;
  const prices = same.map((p) => p.price).filter((price): price is number => typeof price === 'number' && price > 0);
  return {
    count: same.length,
    pricedCount: prices.length,
    averagePrice: prices.length > 0 ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100 : undefined,
    lastAddedAt: same
      .map((p) => p.addedAt)
      .sort()
      .at(-1) as string,
    discarded: same.filter((p) => p.status === 'discarded').length,
    consumed: same.filter((p) => p.status === 'consumed').length,
  };
}

export interface PastPurchase {
  id: string;
  status: Product['status'];
  price?: number;
  closedAt: string;
  /** Jours réellement passés entre l’achat et la sortie du frigo. */
  keptDays: number;
}

export interface PastPurchases {
  count: number;
  /** Prix moyen (euros) des achats où il est renseigné. */
  averagePrice?: number;
  /** Durée médiane réelle, en jours (et non la date indiquée sur l’emballage). */
  keptDays: number;
  consumed: number;
  discarded: number;
  /** Les trois derniers, du plus récent au plus ancien. */
  recent: PastPurchase[];
}

const RECENT_PURCHASES = 3;

/**
 * Achats déjà terminés d’un produit, pour sa fiche : même nom, au singulier ou au pluriel.
 * Le produit affiché et ceux encore au frigo sont exclus : on ne connaît pas encore leur durée réelle.
 */
export function pastPurchases(products: readonly Product[], product: Product): PastPurchases | null {
  const key = normalizeText(product.name);
  const head = significantHead(product.name).join(' ');
  const closed = products
    .filter((p) => p.id !== product.id && p.status !== 'active' && p.closedAt)
    .filter((p) => normalizeText(p.name) === key || (head !== '' && significantHead(p.name).join(' ') === head))
    .map((p) => ({
      id: p.id,
      status: p.status,
      price: isValidPrice(p.price) ? p.price : undefined,
      closedAt: p.closedAt as string,
      keptDays: Math.max(
        0,
        daysBetween(toLocalDateString(new Date(p.addedAt)), toLocalDateString(new Date(p.closedAt as string))),
      ),
    }))
    .sort((a, b) => b.closedAt.localeCompare(a.closedAt));
  if (closed.length === 0) return null;
  const prices = closed.map((p) => p.price).filter((price): price is number => price !== undefined);
  const spans = closed.map((p) => p.keptDays).sort((a, b) => a - b);
  const mid = Math.floor(spans.length / 2);
  return {
    count: closed.length,
    averagePrice:
      prices.length > 0 ? Math.round((prices.reduce((sum, price) => sum + price, 0) / prices.length) * 100) / 100 : undefined,
    keptDays: spans.length % 2 ? (spans[mid] as number) : Math.round(((spans[mid - 1] as number) + (spans[mid] as number)) / 2),
    consumed: closed.filter((p) => p.status === 'consumed').length,
    discarded: closed.filter((p) => p.status === 'discarded').length,
    recent: closed.slice(0, RECENT_PURCHASES),
  };
}

/** Phrase courte pour le formulaire ; met en avant le gaspillage récurrent quand il y en a. */
export function describePurchaseHistory(history: PurchaseHistory): { text: string; warn: boolean } {
  const closed = history.consumed + history.discarded;
  const parts = [`Déjà acheté ${history.count === 1 ? 'une fois' : `${history.count} fois`}`];
  if (history.averagePrice !== undefined) {
    const euros = `${history.averagePrice.toFixed(2).replace('.', ',')} €`;
    parts.push(history.pricedCount > 1 ? `${euros} en moyenne` : `payé ${euros}`);
  }
  const warn = history.discarded >= 2 && history.discarded * 2 >= closed;
  const text = parts.join(', ') + '.';
  return warn
    ? {
        text: `${text} Vous en avez jeté ${history.discarded} sur ${closed} : une plus petite quantité suffirait peut-être.`,
        warn,
      }
    : { text, warn };
}
