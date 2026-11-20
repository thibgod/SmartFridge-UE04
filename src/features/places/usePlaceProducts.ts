import { useMemo } from 'react';

import { useProducts } from '@/features/products/ProductsProvider';

import { productsInPlace } from './places';
import { usePlaces } from './PlacesProvider';

/**
 * Produits actifs du lieu affiché : ce que l’on a sous la main pour cuisiner ou ranger.
 * Les limites gratuites, elles, comptent tous les lieux (voir features/premium/limits).
 */
export function usePlaceProducts() {
  const { activeProducts } = useProducts();
  const { places, current } = usePlaces();
  return useMemo(() => productsInPlace(activeProducts, current.id, places), [activeProducts, current.id, places]);
}
