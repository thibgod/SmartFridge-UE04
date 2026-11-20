import { SHELF_LIFE_DAYS } from '@/data/shelfLife';
import type { LocalDateString, Product, ProductCategory, ProductInput } from '@/types/product';
import { addDays, daysBetween } from '@/utils/date';

/**
 * Actions anti-gaspi en un geste depuis la fiche produit. Chacune renvoie les nouvelles
 * données du produit (ou null si l’action n’a pas de sens), sans toucher à la base :
 * l’écran les enregistre et propose « Annuler ».
 */

/** Conservation prudente au frigo une fois le produit entamé (jours). */
export const OPENED_SHELF_LIFE: Record<ProductCategory, number> = {
  produits_laitiers: 3,
  viande_poisson: 2,
  plats_prepares: 3,
  fruits_legumes: 3,
  feculents: 5,
  autre: 5,
};

/** Après décongélation au réfrigérateur : à consommer sous 24 h. */
export const THAWED_SHELF_LIFE = 1;

export function productToInput(product: Product): ProductInput {
  return {
    name: product.name,
    category: product.category,
    quantity: product.quantity,
    expiresAt: product.expiresAt,
    location: product.location,
    price: product.price,
    imageUri: product.imageUri,
    barcode: product.barcode,
    brand: product.brand,
    notes: product.notes,
    source: product.source,
    openedAt: product.openedAt,
    remaining: product.remaining,
  };
}

const later = (a: LocalDateString, b: LocalDateString) => (daysBetween(a, b) > 0 ? b : a);
const earlier = (a: LocalDateString, b: LocalDateString) => (daysBetween(a, b) < 0 ? b : a);

export type SmartAction = 'freeze' | 'thaw' | 'open' | 'partial';

export interface SmartActionPlan {
  action: SmartAction;
  input: ProductInput;
  /** Nouvelle date de péremption, pour le message de confirmation. */
  newExpiresAt: LocalDateString;
}

/** Congeler : possible tant que la date n’est pas dépassée ; la conservation repart du jour. */
export function planFreeze(product: Product, today: LocalDateString): SmartActionPlan | null {
  if (product.location === 'congelateur' || daysBetween(today, product.expiresAt) < 0) return null;
  const frozenUntil = addDays(today, SHELF_LIFE_DAYS.congelateur[product.category]);
  const newExpiresAt = later(product.expiresAt, frozenUntil);
  return { action: 'freeze', newExpiresAt, input: { ...productToInput(product), location: 'congelateur', expiresAt: newExpiresAt } };
}

/** Sortir du congélateur : décongélation au frigo, à consommer rapidement. */
export function planThaw(product: Product, today: LocalDateString): SmartActionPlan | null {
  if (product.location !== 'congelateur') return null;
  const newExpiresAt = earlier(product.expiresAt, addDays(today, THAWED_SHELF_LIFE));
  return { action: 'thaw', newExpiresAt, input: { ...productToInput(product), location: 'frigo', expiresAt: newExpiresAt } };
}

/** Entamer : un produit ouvert se garde moins longtemps, la date est raccourcie si besoin. */
export function planOpen(product: Product, today: LocalDateString): SmartActionPlan | null {
  if (product.openedAt || product.location !== 'frigo') return null;
  const newExpiresAt = earlier(product.expiresAt, addDays(today, OPENED_SHELF_LIFE[product.category]));
  return { action: 'open', newExpiresAt, input: { ...productToInput(product), openedAt: today, expiresAt: newExpiresAt } };
}

/**
 * Utilisation partielle : on note ce qu’il reste. Au frigo, un produit dont on vient
 * d’utiliser une partie est forcément entamé : la date est raccourcie comme pour « Je l’ai entamé ».
 */
export function planPartial(product: Product, remaining: number, today: LocalDateString): SmartActionPlan {
  const opened = planOpen(product, today);
  const base = opened ? opened.input : productToInput(product);
  return { action: 'partial', newExpiresAt: base.expiresAt, input: { ...base, remaining } };
}
