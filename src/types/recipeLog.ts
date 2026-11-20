export interface CookedEntry {
  id: string;
  recipeId: string;
  cookedAt: string; // ISO
  /** Produits du frigo marqués consommés à cette occasion. */
  savedCount: number;
}

export interface RecipeStats {
  timesCooked: number;
  lastCookedAt?: string;
}
