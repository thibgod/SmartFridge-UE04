import type { Product } from '@/types/product';
import { daysUntil } from '@/utils/date';
import { getExpiryLevel, getShortExpiryLabel, type ExpiryLevel } from '@/utils/expiry';

/** Données affichées par le widget (sérialisables : le widget tourne hors de l’app). */
export interface ExpiringWidgetProps {
  /** Produits à surveiller, les plus pressés d’abord (périmés inclus). */
  items: { name: string; when: string; level: ExpiryLevel }[];
  urgentCount: number;
  expiredCount: number;
  /** Version gratuite : le widget invite à passer à Premium au lieu d’afficher la liste. */
  locked?: boolean;
}

/** Contenu du widget sans abonnement : aucune donnée de l’inventaire n’est envoyée. */
export const LOCKED_WIDGET_PROPS: ExpiringWidgetProps = { items: [], urgentCount: 0, expiredCount: 0, locked: true };

export interface WidgetTimelineEntry {
  date: Date;
  props: ExpiringWidgetProps;
}

const MAX_ITEMS = 4;
const TIMELINE_DAYS = 7;

/** Ce que le widget doit savoir d’un produit : ni prix, ni notes, ni photo. */
export type WidgetProduct = Pick<Product, 'name' | 'expiresAt' | 'status'>;

export function buildWidgetProps(products: readonly WidgetProduct[], now: Date, threshold: number): ExpiringWidgetProps {
  const watched = products
    .filter((p) => p.status === 'active')
    .map((product) => ({ product, days: daysUntil(product.expiresAt, now) }))
    .map((entry) => ({ ...entry, level: getExpiryLevel(entry.days, threshold) }))
    .filter((entry) => entry.level !== 'ok')
    .sort((a, b) => a.days - b.days || a.product.name.localeCompare(b.product.name, 'fr'));

  return {
    items: watched.slice(0, MAX_ITEMS).map(({ product, days, level }) => ({
      name: product.name,
      when: getShortExpiryLabel(days),
      level,
    })),
    urgentCount: watched.filter((entry) => entry.level === 'urgent').length,
    expiredCount: watched.filter((entry) => entry.level === 'expired').length,
  };
}

/**
 * Une entrée par jour à minuit (heure locale) : « Demain » devient « Aujourd’hui »
 * sans que l’app ait besoin d’être ouverte.
 */
export function buildWidgetTimeline(products: readonly WidgetProduct[], now: Date, threshold: number): WidgetTimelineEntry[] {
  const entries: WidgetTimelineEntry[] = [{ date: now, props: buildWidgetProps(products, now, threshold) }];
  for (let day = 1; day < TIMELINE_DAYS; day += 1) {
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day);
    entries.push({ date: midnight, props: buildWidgetProps(products, midnight, threshold) });
  }
  return entries;
}

/**
 * Android : le widget est dessiné par une tâche qui démarre sans l’app. Elle relit cette copie
 * et recalcule les échéances du jour, pour que « Demain » devienne « Aujourd’hui » tout seul.
 */
export interface WidgetSnapshot {
  isPremium: boolean;
  threshold: number;
  products: WidgetProduct[];
}

/** Au-delà, les produits périment trop loin pour apparaître dans le widget avant la prochaine ouverture de l’app. */
const MAX_SNAPSHOT_PRODUCTS = 100;

export function buildWidgetSnapshot(products: readonly Product[], threshold: number, isPremium: boolean): WidgetSnapshot {
  // Sans abonnement, aucune donnée de l’inventaire n’est copiée.
  if (!isPremium) return { isPremium, threshold, products: [] };
  const watched = products
    .filter((p) => p.status === 'active')
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
    .slice(0, MAX_SNAPSHOT_PRODUCTS)
    .map(({ name, expiresAt, status }) => ({ name, expiresAt, status }));
  return { isPremium, threshold, products: watched };
}

export function parseWidgetSnapshot(text: string): WidgetSnapshot | null {
  try {
    const value = JSON.parse(text) as Partial<WidgetSnapshot> | null;
    if (typeof value?.isPremium !== 'boolean' || typeof value.threshold !== 'number' || !Array.isArray(value.products)) return null;
    return { isPremium: value.isPremium, threshold: value.threshold, products: value.products };
  } catch {
    return null;
  }
}

export function propsFromSnapshot(snapshot: WidgetSnapshot | null, now: Date): ExpiringWidgetProps {
  if (!snapshot?.isPremium) return LOCKED_WIDGET_PROPS;
  return buildWidgetProps(snapshot.products, now, snapshot.threshold);
}
