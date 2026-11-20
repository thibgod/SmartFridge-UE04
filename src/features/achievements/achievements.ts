import type { IconName } from '@/types/content';
import type { Product } from '@/types/product';
import type { CookedEntry } from '@/types/recipeLog';
import { daysBetween, toLocalDateString } from '@/utils/date';
import { computeImpact } from '@/utils/impact';
import { isValidPrice, toCents } from '@/utils/price';

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  current: number;
  target: number;
  achieved: boolean;
}

export interface Achievements {
  badges: Badge[];
  /** Jours consécutifs sans rien jeter, jusqu’à aujourd’hui ; null sans historique. */
  streakDays: number | null;
  /** Prochain badge le plus proche d’être obtenu. */
  next: Badge | null;
}

const closedDay = (product: Product) => toLocalDateString(new Date(product.closedAt ?? product.updatedAt));

/**
 * Série « sans gaspillage » : jours écoulés depuis le dernier produit jeté
 * (ou depuis le premier produit clôturé si rien n’a jamais été jeté).
 */
export function wasteFreeStreak(products: readonly Product[], now: Date = new Date()): number | null {
  const closed = products.filter((p) => p.status !== 'active');
  if (closed.length === 0) return null;
  const today = toLocalDateString(now);
  const discarded = closed.filter((p) => p.status === 'discarded').map(closedDay).sort();
  const lastDiscard = discarded[discarded.length - 1];
  if (lastDiscard) return Math.max(0, daysBetween(lastDiscard, today));
  const first = closed.map(closedDay).sort()[0] ?? today;
  return Math.max(0, daysBetween(first, today)) + 1;
}

type BadgeSpec = Omit<Badge, 'current' | 'achieved'> & { metric: keyof Metrics };

interface Metrics {
  saved: number;
  streak: number;
  cooked: number;
  euros: number;
  co2: number;
}

const BADGES: readonly BadgeSpec[] = [
  { id: 'first-save', title: 'Premier sauvetage', description: 'Consommer un premier produit suivi', icon: 'leaf', metric: 'saved', target: 1 },
  { id: 'save-10', title: 'Bon réflexe', description: '10 produits consommés à temps', icon: 'checkmark-done', metric: 'saved', target: 10 },
  { id: 'save-50', title: 'Anti-gaspi confirmé', description: '50 produits consommés à temps', icon: 'medal', metric: 'saved', target: 50 },
  { id: 'save-100', title: 'Héros du frigo', description: '100 produits consommés à temps', icon: 'trophy', metric: 'saved', target: 100 },
  { id: 'week', title: 'Semaine zéro déchet', description: '7 jours d’affilée sans rien jeter', icon: 'calendar', metric: 'streak', target: 7 },
  { id: 'month', title: 'Mois zéro déchet', description: '30 jours d’affilée sans rien jeter', icon: 'ribbon', metric: 'streak', target: 30 },
  { id: 'chef', title: 'Aux fourneaux', description: 'Cuisiner une recette anti-gaspi', icon: 'restaurant', metric: 'cooked', target: 1 },
  { id: 'chef-10', title: 'Chef anti-gaspi', description: '10 recettes cuisinées', icon: 'flame', metric: 'cooked', target: 10 },
  { id: 'euros-50', title: 'Belles économies', description: '50 € de produits consommés', icon: 'wallet', metric: 'euros', target: 50 },
  { id: 'co2-25', title: 'Petit geste, grand effet', description: '25 kg de CO₂ évités (estimation)', icon: 'earth', metric: 'co2', target: 25 },
];

export function computeAchievements(
  products: readonly Product[],
  history: readonly CookedEntry[],
  now: Date = new Date(),
): Achievements {
  const consumed = products.filter((p) => p.status === 'consumed');
  const streakDays = wasteFreeStreak(products, now);
  const metrics: Metrics = {
    saved: consumed.length,
    streak: streakDays ?? 0,
    cooked: history.length,
    euros: consumed.reduce((sum, p) => sum + (isValidPrice(p.price) ? toCents(p.price) : 0), 0) / 100,
    co2: computeImpact(products).co2Kg,
  };
  const badges = BADGES.map(({ metric, ...spec }) => {
    const current = metrics[metric];
    return { ...spec, current: Math.min(current, spec.target), achieved: current >= spec.target };
  });
  const next =
    badges
      .filter((b) => !b.achieved)
      .sort((a, b) => b.current / b.target - a.current / a.target || a.target - b.target)[0] ?? null;
  return { badges, streakDays, next };
}
