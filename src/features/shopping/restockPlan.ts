import type { Product, ProductCategory } from '@/types/product';
import type { Household } from '@/types/settings';
import type { ShoppingItem } from '@/types/shopping';
import { daysBetween, daysUntil, isValidLocalDate, toLocalDateString } from '@/utils/date';
import { parseWeightKg } from '@/utils/impact';
import { remainingShare } from '@/utils/remaining';
import { normalizeText, pluralize } from '@/utils/text';

/**
 * Suggestions de courses en quantités logiques, calculées sur le téléphone à partir de l’historique.
 *
 * Pour chaque produit déjà acheté plusieurs fois :
 * 1. rythme d’achat appris (lots achetés / jours écoulés entre le premier et le dernier achat, six derniers lots),
 *    ou, faute de mieux, temps mis à finir un lot ;
 * 2. corrigé par ce qui est vraiment mangé (un produit jeté une fois sur trois est proposé un tiers moins) ;
 * 3. tant que l’historique est court, mélangé avec une consommation de référence : la part de ce produit dans
 *    les achats de sa catégorie × la consommation moyenne d’un adulte (INCA 3, ANSES) × la taille du foyer ;
 * 4. besoin = rythme × jours jusqu’aux prochaines courses − ce qui reste au frigo et sera mangé avant sa date ;
 * 5. jamais plus que ce qui peut être mangé avant la date habituelle du produit.
 */

/** Consommation moyenne d’un adulte, en kg par jour (INCA 3, ANSES 2017 ; arrondis prudents). */
export const ADULT_DAILY_KG: Partial<Record<ProductCategory, number>> = {
  // Fruits 130 g/j + légumes 130 g/j.
  fruits_legumes: 0.26,
  // Viandes et volailles 73 g/j + charcuterie 26 g/j (le poisson n’est pas compté : estimation basse).
  viande_poisson: 0.1,
  // Yaourts et fromages blancs 75 g/j, lait et fromage en plus : environ 200 g/j.
  produits_laitiers: 0.2,
  // Pain 115 g/j + pâtes, riz et céréales 64 g/j.
  feculents: 0.18,
};

/**
 * Besoins d’un enfant de moins de 12 ans par rapport à un adulte : environ 0,7.
 * Apports énergétiques de référence (EFSA 2013) : 1 280 kcal à 3-5 ans, 1 715 kcal à 6-11 ans,
 * contre 2 090 (femme) à 2 600 kcal (homme) pour un adulte.
 */
export const CHILD_FACTOR = 0.7;
/** Courses environ une fois par semaine quand l’historique ne dit rien (84 % des Français au moins une fois par semaine). */
export const DEFAULT_SHOP_INTERVAL_DAYS = 7;
const MIN_SHOP_INTERVAL = 3;
const MAX_SHOP_INTERVAL = 14;
/** Nombre de lots récents pris en compte : le rythme suit les changements d’habitude. */
const RECENT_LOTS = 6;
/** Fenêtre pour la part d’un produit dans sa catégorie. */
const MIX_WINDOW_DAYS = 90;
/** Au-delà de 3 intervalles observés, l’historique du foyer suffit. */
const CYCLES_FOR_FULL_TRUST = 3;
/** Pas de suggestion pour moins d’un demi-lot manquant. */
const MIN_NEED = 0.5;
/** Plus racheté depuis 3 cycles habituels (et au moins 45 jours) : habitude abandonnée, plus proposé. */
const STALE_CYCLES = 3;
const STALE_MIN_DAYS = 45;
/** Un produit jeté plus d’une fois sur deux n’est plus proposé. */
const MIN_EATEN_RATIO = 0.5;

const dayOf = (iso: string) => toLocalDateString(new Date(iso));
const median = (values: readonly number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? (sorted[mid] ?? null) : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
};

/** Nombre d’« équivalents adultes » du foyer ; null si le foyer n’est pas renseigné. */
export function householdEquivalents(household: Household | null): number | null {
  return household ? household.adults + household.children * CHILD_FACTOR : null;
}

/** « 2 adultes et 1 enfant », « 1 adulte ». */
export function householdLabel(household: Household): string {
  const adults = pluralize(household.adults, 'adulte');
  return household.children > 0 ? `${adults} et ${pluralize(household.children, 'enfant')}` : adults;
}

/**
 * Intervalle habituel entre deux courses : jours où au moins deux produits ont été ajoutés,
 * écart médian entre ces jours (huit derniers), borné entre 3 et 14 jours.
 */
export function shopIntervalDays(products: readonly Product[]): number {
  const perDay = new Map<string, number>();
  for (const p of products) {
    const day = dayOf(p.addedAt);
    perDay.set(day, (perDay.get(day) ?? 0) + 1);
  }
  const days = [...perDay.entries()]
    .filter(([, count]) => count >= 2)
    .map(([day]) => day)
    .sort()
    .slice(-9);
  const gaps = days.slice(1).map((day, i) => daysBetween(days[i] ?? day, day));
  const typical = median(gaps);
  if (typical === null) return DEFAULT_SHOP_INTERVAL_DAYS;
  return Math.min(MAX_SHOP_INTERVAL, Math.max(MIN_SHOP_INTERVAL, Math.round(typical)));
}

export interface RestockSuggestion {
  name: string;
  category: ProductCategory;
  /** Quantité à écrire sur la liste (« 2 × 500 g », « 12 », « 1 kg »), vide si un seul lot sans quantité. */
  quantity: string;
  /** Nombre de lots habituels à acheter. */
  packs: number;
  /** Explication courte (« Environ 2 par semaine · il en reste ½ »). */
  reason: string;
  /** Nombre de fois où le produit a été consommé. */
  consumedCount: number;
}

interface Group {
  lots: Product[];
  consumed: number;
  discarded: number;
  /** Part réellement mangée des lots clôturés (un fond jeté compte pour la part mangée). */
  eaten: number;
}

/** Lots par jour d’après l’historique, et nombre d’intervalles observés (confiance). */
function observedRate(lots: readonly Product[]): { rate: number; cycles: number } | null {
  const recent = [...lots].sort((a, b) => a.addedAt.localeCompare(b.addedAt)).slice(-RECENT_LOTS);
  const days = [...new Set(recent.map((p) => dayOf(p.addedAt)))].sort();
  const first = days[0];
  const last = days.at(-1);
  if (first && last && days.length >= 2) {
    // Le dernier achat n’a pas encore été consommé : on compte les lots achetés avant lui.
    const before = recent.filter((p) => dayOf(p.addedAt) < last).length;
    return { rate: before / Math.max(1, daysBetween(first, last)), cycles: days.length - 1 };
  }
  // Un seul jour d’achat : temps mis à finir un lot consommé.
  const finish = median(
    recent
      .filter((p) => p.status === 'consumed' && p.closedAt)
      .map((p) => daysBetween(dayOf(p.addedAt), dayOf(p.closedAt ?? ''))),
  );
  return finish === null ? null : { rate: 1 / Math.max(1, finish), cycles: 0.5 };
}

/** Lots par jour attendus pour ce foyer : part du produit dans sa catégorie × consommation de référence. */
function referenceRate(
  group: Group,
  category: ProductCategory,
  categoryKg: number,
  equivalents: number | null,
  now: Date,
): number | null {
  const daily = ADULT_DAILY_KG[category];
  if (daily === undefined || equivalents === null || categoryKg <= 0) return null;
  const windowLots = group.lots.filter((p) => daysBetween(dayOf(p.addedAt), toLocalDateString(now)) <= MIX_WINDOW_DAYS);
  const kg = windowLots.reduce((sum, p) => sum + (parseWeightKg(p.quantity) ?? 0), 0);
  const packKg = median(windowLots.map((p) => parseWeightKg(p.quantity)).filter((v): v is number => v !== null));
  if (!packKg || kg <= 0) return null;
  return ((kg / categoryKg) * daily * equivalents) / packKg;
}

/** « 2 × 500 g », « 12 » (2 boîtes de 6), « 500 g » pour un lot. */
export function formatPacks(packs: number, packLabel: string): string {
  const label = packLabel.trim();
  const pieces = Number(label);
  if (label === '' || pieces === 1) return packs > 1 ? String(packs) : '';
  if (Number.isInteger(pieces) && pieces > 1) return String(packs * pieces);
  return packs > 1 ? `${packs} × ${label}` : label;
}

function rhythmText(perWeek: number): string {
  if (perWeek >= 1.5) return `Environ ${Math.round(perWeek)} par semaine`;
  if (perWeek >= 0.75) return 'Environ 1 par semaine';
  const weeks = Math.round(1 / perWeek);
  return weeks >= 5 ? 'Environ 1 par mois' : `Environ 1 toutes les ${weeks} semaines`;
}

export interface RestockOptions {
  household?: Household | null;
  now?: Date;
  limit?: number;
}

/**
 * Produits à racheter avec leur quantité. Proposé quand ce qui reste ne tiendra pas jusqu’aux prochaines
 * courses, jamais pour un produit déjà sur la liste ni pour un produit jeté plus d’une fois sur deux.
 */
export function suggestRestock(
  products: readonly Product[],
  items: readonly ShoppingItem[],
  { household = null, now = new Date(), limit = 8 }: RestockOptions = {},
): RestockSuggestion[] {
  const onList = new Set(items.filter((item) => !item.checked).map((item) => normalizeText(item.name)));
  const equivalents = householdEquivalents(household);
  const horizon = shopIntervalDays(products);
  const today = toLocalDateString(now);

  const groups = new Map<string, Group>();
  const categoryKg = new Map<ProductCategory, number>();
  for (const p of products) {
    const key = normalizeText(p.name);
    if (!key) continue;
    const group = groups.get(key) ?? { lots: [], consumed: 0, discarded: 0, eaten: 0 };
    group.lots.push(p);
    if (p.status === 'consumed') {
      group.consumed += 1;
      group.eaten += 1;
    } else if (p.status === 'discarded') {
      group.discarded += 1;
      group.eaten += 1 - remainingShare(p.remaining);
    }
    groups.set(key, group);
    if (daysBetween(dayOf(p.addedAt), today) <= MIX_WINDOW_DAYS) {
      categoryKg.set(p.category, (categoryKg.get(p.category) ?? 0) + (parseWeightKg(p.quantity) ?? 0));
    }
  }

  const suggestions: (RestockSuggestion & { runsOutIn: number })[] = [];
  for (const [key, group] of groups) {
    const closed = group.consumed + group.discarded;
    if (group.lots.length < 2 || group.consumed < 1 || onList.has(key)) continue;
    const eatenRatio = closed > 0 ? group.eaten / closed : 1;
    if (eatenRatio < MIN_EATEN_RATIO) continue;

    const latest = group.lots.reduce((a, b) => (b.addedAt > a.addedAt ? b : a));
    const observed = observedRate(group.lots);
    const reference = referenceRate(group, latest.category, categoryKg.get(latest.category) ?? 0, equivalents, now);
    if (!observed && reference === null) continue;
    // Plus l’historique est long, plus il compte ; la référence ne sert qu’à démarrer.
    const trust = observed ? Math.min(1, observed.cycles / CYCLES_FOR_FULL_TRUST) : 0;
    const bought = reference === null ? (observed?.rate ?? 0) : trust * (observed?.rate ?? 0) + (1 - trust) * reference;
    const rate = bought * eatenRatio;
    if (rate <= 0) continue;
    // Produit qu’on n’achète plus : ne pas le proposer indéfiniment.
    const sinceLast = daysBetween(dayOf(latest.addedAt), today);
    if (sinceLast > Math.max(STALE_MIN_DAYS, STALE_CYCLES / bought)) continue;

    // Ce qui reste et sera mangé avant sa date.
    const stock = group.lots
      .filter((p) => p.status === 'active' && isValidLocalDate(p.expiresAt) && daysUntil(p.expiresAt, now) >= 0)
      .reduce((sum, p) => sum + Math.min(remainingShare(p.remaining), rate * (daysUntil(p.expiresAt, now) + 1)), 0);
    const need = rate * horizon - stock;
    if (need < MIN_NEED) continue;

    // Pas plus que ce qui sera mangé avant la date habituelle du produit.
    const shelf = median(
      group.lots.filter((p) => isValidLocalDate(p.expiresAt)).map((p) => Math.max(1, daysBetween(dayOf(p.addedAt), p.expiresAt))),
    );
    const maxPacks = shelf === null ? Infinity : Math.max(1, Math.round(rate * shelf));
    const packs = Math.max(1, Math.min(Math.round(need), maxPacks));

    const parts = [rhythmText(rate * 7)];
    parts.push(stock > 0.05 ? 'il en reste un peu' : 'plus en stock');
    if (group.discarded > 0 && group.discarded / closed >= 1 / 3) {
      parts.push(`quantité réduite : ${pluralize(group.discarded, 'jeté')} sur ${closed}`);
    }
    suggestions.push({
      name: latest.name,
      category: latest.category,
      quantity: formatPacks(packs, latest.quantity),
      packs,
      reason: parts.join(' · '),
      consumedCount: group.consumed,
      runsOutIn: stock / rate,
    });
  }

  return suggestions
    .sort((a, b) => a.runsOutIn - b.runsOutIn || b.consumedCount - a.consumedCount)
    .slice(0, limit)
    .map(({ runsOutIn: _, ...s }) => s);
}
