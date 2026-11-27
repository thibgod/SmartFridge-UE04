import type { ProductInput } from '@/types/product';

/** Au plus 20 lots d’un coup : au-delà, c’est une faute de frappe plus qu’un achat. */
export const MAX_LOTS_PER_ADD = 20;

/** Nombre de lots qu’on peut ajouter d’un coup, dans la limite des places libres (version gratuite). */
export function allowedLots(remainingSlots: number): number {
  return Math.max(1, Math.min(MAX_LOTS_PER_ADD, remainingSlots));
}

/**
 * Plusieurs lots identiques (4 beurres) : un produit par lot, pour que chacun se consomme ou se jette
 * séparément. À l’accueil, ils sont réunis sur une ligne (« Beurre ×4 »).
 */
export function lotInputs(input: ProductInput, count: number): ProductInput[] {
  const lots = Math.max(1, Math.min(MAX_LOTS_PER_ADD, Math.floor(count)));
  return Array.from({ length: lots }, () => ({ ...input }));
}
