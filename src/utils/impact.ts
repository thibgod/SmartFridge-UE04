import type { Product, ProductCategory } from '@/types/product';

import { remainingShare } from './remaining';

/**
 * Impact estimé des produits sauvés (consommés) : poids et émissions évitées.
 * Ordres de grandeur prudents inspirés des moyennes Agribalyse (ADEME), arrondis :
 * l’objectif est de rendre l’effort concret, pas de faire un bilan carbone.
 */

/** Poids moyen d’un produit quand la quantité ne le dit pas (kg). */
const DEFAULT_WEIGHT_KG: Record<ProductCategory, number> = {
  fruits_legumes: 0.5,
  viande_poisson: 0.35,
  produits_laitiers: 0.4,
  feculents: 0.4,
  plats_prepares: 0.4,
  autre: 0.3,
};

/** kg CO₂e par kg d’aliment produit. */
const CO2_PER_KG: Record<ProductCategory, number> = {
  fruits_legumes: 1,
  viande_poisson: 12,
  produits_laitiers: 4,
  feculents: 1.5,
  plats_prepares: 3,
  autre: 2,
};

/** Voiture thermique moyenne, kg CO₂e par km. */
export const CAR_CO2_PER_KM = 0.2;

const UNIT_KG: Record<string, number> = { kg: 1, g: 0.001, gr: 0.001, l: 1, cl: 0.01, ml: 0.001 };
const MAX_KG = 10;

/**
 * Poids lu dans la quantité saisie : « 500 g », « 1,5 kg », « 4 x 125 g », « 75cl ».
 * null si la quantité n’indique pas de poids (« 1 », « 6 »).
 */
export function parseWeightKg(quantity: string): number | null {
  const text = quantity.toLowerCase().replace(',', '.');
  const match = /(?:(\d+)\s*[x×*]\s*)?(\d+(?:\.\d+)?)\s*(kg|gr|g|cl|ml|l)\b/.exec(text);
  if (!match) return null;
  const count = match[1] ? Number(match[1]) : 1;
  const kg = count * Number(match[2]) * (UNIT_KG[match[3] ?? ''] ?? 0);
  return kg > 0 && kg <= MAX_KG ? kg : null;
}

export function estimateWeightKg(product: Pick<Product, 'quantity' | 'category'>): number {
  const parsed = parseWeightKg(product.quantity);
  if (parsed !== null) return parsed;
  // « 3 » sans unité : plusieurs pièces, plafonné pour rester prudent.
  const pieces = Number(product.quantity.trim());
  const factor = Number.isInteger(pieces) && pieces > 1 ? Math.min(pieces, 4) * 0.5 : 1;
  return DEFAULT_WEIGHT_KG[product.category] * factor;
}

export interface ImpactSummary {
  savedKg: number;
  co2Kg: number;
  /** Équivalent en kilomètres de voiture. */
  carKm: number;
}

export function computeImpact(products: readonly Product[]): ImpactSummary {
  let savedKg = 0;
  let co2Kg = 0;
  for (const product of products) {
    if (product.status === 'active') continue;
    // Jeté après une utilisation partielle : la part mangée compte quand même.
    const eaten = product.status === 'consumed' ? 1 : 1 - remainingShare(product.remaining);
    if (eaten <= 0) continue;
    const kg = estimateWeightKg(product) * eaten;
    savedKg += kg;
    co2Kg += kg * CO2_PER_KG[product.category];
  }
  return { savedKg, co2Kg, carKm: co2Kg / CAR_CO2_PER_KM };
}

/** « 850 g », « 3,2 kg », « 12 kg ». */
export function formatKg(kg: number): string {
  if (kg < 1) return `${Math.round(kg * 1000 / 10) * 10} g`;
  return `${(kg < 10 ? Math.round(kg * 10) / 10 : Math.round(kg)).toString().replace('.', ',')} kg`;
}
