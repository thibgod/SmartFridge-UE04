import { SHELF_LIFE_DAYS } from '@/data/shelfLife';
import { guessCategory } from '@/services/images/foodImages';
import type { LocalDateString, ProductCategory, ProductInput, ProductLocation } from '@/types/product';
import type { ShoppingItem } from '@/types/shopping';
import { addDays } from '@/utils/date';
import { significantHead } from '@/utils/foodName';

import type { ReceiptLine } from './receiptParser';

/** Article du ticket en cours de relecture par l’utilisateur. */
export interface ReceiptCandidate {
  key: string;
  name: string;
  category: ProductCategory;
  location: ProductLocation;
  quantity: number;
  /** Prix total de la ligne (prix unitaire × quantité). */
  price?: number;
  /** Reconnu comme un aliment : coché par défaut. Les autres (lessive, sac…) restent décochés. */
  selected: boolean;
}

/** Pain et viennoiseries : féculents, mais à manger vite. */
const BAKERY = /\b(pain|pains|baguette|baguettes|brioche|brioches|croissant|croissants|viennoiserie|viennoiseries)\b/;
const BAKERY_DAYS = 3;

/** Les produits secs (pâtes, riz, conserves…) vont au placard ; le reste au frigo. */
const DEFAULT_LOCATION: Record<ProductCategory, ProductLocation> = {
  fruits_legumes: 'frigo',
  viande_poisson: 'frigo',
  produits_laitiers: 'frigo',
  feculents: 'placard',
  plats_prepares: 'frigo',
  autre: 'placard',
};

const isBakery = (name: string) => significantHead(name).some((word) => BAKERY.test(word));

export function toCandidates(lines: readonly ReceiptLine[]): ReceiptCandidate[] {
  return lines.map((line, index) => {
    const guessed = guessCategory(line.name);
    const category = guessed ?? 'autre';
    return {
      key: `${index}-${line.name}`,
      name: line.name,
      category,
      location: DEFAULT_LOCATION[category],
      quantity: line.quantity,
      price: line.price !== undefined ? Math.round(line.price * line.quantity * 100) / 100 : undefined,
      selected: guessed !== null,
    };
  });
}

/** Date estimée, prudente : l’utilisateur la corrige ensuite d’après l’emballage. */
export function candidateExpiry(candidate: Pick<ReceiptCandidate, 'name' | 'category' | 'location'>, today: LocalDateString): LocalDateString {
  const days =
    candidate.location !== 'congelateur' && isBakery(candidate.name)
      ? BAKERY_DAYS
      : SHELF_LIFE_DAYS[candidate.location][candidate.category];
  return addDays(today, days);
}

export function candidateToInput(candidate: ReceiptCandidate, today: LocalDateString): ProductInput {
  return {
    name: candidate.name.trim(),
    category: candidate.category,
    quantity: String(candidate.quantity),
    expiresAt: candidateExpiry(candidate, today),
    location: candidate.location,
    price: candidate.price,
    source: 'manual',
  };
}

const NEXT_LOCATION: Record<ProductLocation, ProductLocation> = { frigo: 'congelateur', congelateur: 'placard', placard: 'frigo' };
export const nextLocation = (location: ProductLocation): ProductLocation => NEXT_LOCATION[location];

/**
 * Articles de la liste de courses couverts par les achats : même aliment principal
 * (« Lait » est couvert par « Lait demi écrémé »).
 */
export function coveredShoppingItems(purchased: readonly string[], items: readonly ShoppingItem[]): ShoppingItem[] {
  const heads = purchased.map((name) => new Set(significantHead(name)));
  return items.filter((item) => {
    const wanted = significantHead(item.name);
    return wanted.length > 0 && heads.some((head) => wanted.every((word) => head.has(word)));
  });
}
