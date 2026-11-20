import { useCallback, useMemo, useState } from 'react';

import { usePlaceProducts } from '@/features/places/usePlaceProducts';
import { useProducts } from '@/features/products/ProductsProvider';
import { useSettings } from '@/features/settings/SettingsProvider';
import type { Recipe } from '@/types/content';
import type { Product } from '@/types/product';
import { getExpiryInfo } from '@/utils/expiry';
import { haptics } from '@/utils/haptics';

import { productsForRecipe } from './recipeMatching';
import { useRecipeLog } from './RecipeLogProvider';

/**
 * « J’ai cuisiné » : produits du frigo utilisables (les plus urgents cochés d’office),
 * clôture en « consommé » et entrée dans l’historique de la recette.
 */
export function useCookRecipe(recipe: Recipe) {
  const { closeProducts } = useProducts();
  const activeProducts = usePlaceProducts();
  const threshold = useSettings().settings.urgentThresholdDays;
  const { logCooked } = useRecipeLog();

  const usable = useMemo<Product[]>(() => productsForRecipe(recipe, activeProducts), [recipe, activeProducts]);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(usable.filter((p) => getExpiryInfo(p.expiresAt, new Date(), threshold).level === 'urgent').map((p) => p.id)),
  );

  const toggle = useCallback((productId: string) => {
    haptics.select();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }, []);

  /** Enregistre la recette cuisinée ; retourne le nombre de produits sauvés. */
  const cooked = useCallback(async (): Promise<number> => {
    // Seuls les produits encore proposés comptent (un produit a pu être clôturé entre-temps).
    const ids = usable.filter((p) => selected.has(p.id)).map((p) => p.id);
    if (ids.length > 0) await closeProducts(ids, 'consumed');
    await logCooked(recipe.id, ids.length);
    haptics.success();
    return ids.length;
  }, [usable, selected, closeProducts, logCooked, recipe.id]);

  return { usable, selected, toggle, cooked, threshold };
}
