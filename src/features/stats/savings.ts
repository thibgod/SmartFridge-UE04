import type { AverageComparison, WasteStats } from '@/types/stats';
import { formatCents } from '@/utils/price';
import { pluralize } from '@/utils/text';

export interface SavingsText {
  /** Phrase principale : la part jetée comparée au foyer moyen. */
  headline: string;
  /** Produits sauvés de justesse, null s’il n’y en a pas. */
  rescued: string | null;
}

// Espaces insécables : « 15 % » et « moyen : » ne se coupent jamais en fin de ligne.
const NBSP = '\u00a0';
const percent = (share: number) => `${Math.round(share * 100)}${NBSP}%`;

/** Textes de la carte « Par rapport à un foyer moyen » (vouvoiement, typographie française). */
export function savingsText(comparison: AverageComparison, stats: WasteStats, urgentThreshold: number): SavingsText {
  const you = percent(comparison.share);
  const average = percent(comparison.averageShare);
  const headline =
    comparison.verdict === 'better'
      ? `Vous jetez ${you} de vos courses, contre environ ${average} dans un foyer moyen${NBSP}: environ ${formatCents(comparison.avoidedCents)} de moins à la poubelle.`
      : comparison.verdict === 'similar'
        ? `Vous jetez ${you} de vos courses, à peu près comme un foyer moyen (environ ${average}).`
        : `Vous jetez ${you} de vos courses, contre environ ${average} dans un foyer moyen. Commencez par les produits en haut de « Mon frigo » : ce sont les plus pressés.`;
  const days = pluralize(urgentThreshold, 'jour');
  const rescued =
    stats.rescuedCount > 0
      ? `Dont ${formatCents(stats.rescuedCents)} sauvés de justesse${NBSP}: ${pluralize(stats.rescuedCount, 'produit mangé', 'produits mangés')} à ${days} ou moins de leur date.`
      : null;
  return { headline, rescued };
}
