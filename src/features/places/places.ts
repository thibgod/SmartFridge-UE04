import type { IconName } from '@/types/content';
import type { Product } from '@/types/product';

/**
 * Plusieurs frigos et lieux (Premium) : maison secondaire, frigo du bureau, cave… Chaque lieu a son
 * frigo, son congélateur et son placard. « Maison » est le lieu principal, implicite : un produit
 * sans lieu lui appartient, ce qui laisse les données d’avant cette fonction intactes.
 */

export interface Place {
  id: string;
  name: string;
  icon: IconName;
  createdAt: string;
}

export const MAIN_PLACE: Place = { id: 'maison', name: 'Maison', icon: 'home', createdAt: '' };

/** Lieux en plus de la maison : de quoi couvrir les usages courants sans transformer l’app en entrepôt. */
export const MAX_EXTRA_PLACES = 8;
export const PLACE_NAME_MAX_LENGTH = 30;

export const PLACE_ICONS: readonly { icon: IconName; label: string }[] = [
  { icon: 'home-outline', label: 'Maison' },
  { icon: 'briefcase-outline', label: 'Bureau' },
  { icon: 'bed-outline', label: 'Résidence secondaire' },
  { icon: 'wine-outline', label: 'Cave' },
  { icon: 'snow-outline', label: 'Congélateur' },
  { icon: 'car-outline', label: 'Camping-car' },
  { icon: 'people-outline', label: 'Famille' },
  { icon: 'storefront-outline', label: 'Commerce' },
];

/** Lieu d’un produit ; un lieu supprimé entre-temps renvoie à la maison plutôt que de cacher le produit. */
export function placeOf(product: Pick<Product, 'placeId'>, places?: readonly Place[]): string {
  const id = product.placeId;
  if (!id || id === MAIN_PLACE.id) return MAIN_PLACE.id;
  if (places && !places.some((place) => place.id === id)) return MAIN_PLACE.id;
  return id;
}

export function productsInPlace<T extends Pick<Product, 'placeId' | 'status'>>(
  products: readonly T[],
  placeId: string,
  places: readonly Place[],
): T[] {
  return products.filter((p) => p.status === 'active' && placeOf(p, places) === placeId);
}

/** Produits actifs par lieu (maison comprise). */
export function countByPlace(products: readonly Product[], places: readonly Place[]): Record<string, number> {
  const counts: Record<string, number> = { [MAIN_PLACE.id]: 0 };
  for (const place of places) counts[place.id] = 0;
  for (const product of products) {
    if (product.status !== 'active') continue;
    const id = placeOf(product, places);
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

export function normalizePlaceName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

const sameName = (a: string, b: string) => a.localeCompare(b, 'fr', { sensitivity: 'base' }) === 0;

/** Message d’erreur, ou null si le nom convient. `editingId` : le lieu renommé (son propre nom est permis). */
export function validatePlaceName(name: string, places: readonly Place[], editingId?: string): string | null {
  const clean = normalizePlaceName(name);
  if (!clean) return 'Donnez un nom à ce lieu.';
  if (clean.length > PLACE_NAME_MAX_LENGTH) return `${PLACE_NAME_MAX_LENGTH} caractères au maximum.`;
  const taken = [MAIN_PLACE, ...places].some((place) => place.id !== editingId && sameName(place.name, clean));
  return taken ? 'Ce nom est déjà utilisé.' : null;
}

export function canAddPlace(isPremium: boolean, extraPlaces: number): boolean {
  return isPremium && extraPlaces < MAX_EXTRA_PLACES;
}
