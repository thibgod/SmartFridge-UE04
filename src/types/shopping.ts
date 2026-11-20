import type { ProductCategory } from './product';

/** Origine d’un article : saisi à la main, proposé d’après l’historique, ou ingrédient de recette. */
export type ShoppingSource = 'manual' | 'restock' | 'recipe';

export interface ShoppingItem {
  id: string;
  name: string;
  /** Sert à regrouper la liste par rayon. */
  category: ProductCategory;
  /** Précision libre (« 2 », « 500 g ») ; vide si non renseignée. */
  quantity: string;
  checked: boolean;
  source: ShoppingSource;
  addedAt: string; // ISO
  checkedAt?: string; // ISO
}

export interface ShoppingItemInput {
  name: string;
  category?: ProductCategory;
  quantity?: string;
  source?: ShoppingSource;
}
