import type { Product, ProductCategory } from '@/types/product';

import { DEFAULT_URGENT_THRESHOLD } from './expiry';
import { isRescued } from './stats';

/**
 * Impact estimé des produits sauvés de justesse (voir isRescued) : poids et émissions évitées.
 * Un produit mangé bien avant sa date n’aurait pas été jeté : il ne compte pas.
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

/** Unités reconnues, abrégées ou en toutes lettres (« 250 grammes », « 1 litre », « 2 kilos »). */
const UNITS: readonly { pattern: string; kg: number }[] = [
  { pattern: 'kilogrammes?|kilos?|kg', kg: 1 },
  { pattern: 'centilitres?|cl', kg: 0.01 },
  { pattern: 'millilitres?|ml', kg: 0.001 },
  { pattern: 'grammes?|gr|g', kg: 0.001 },
  { pattern: 'litres?|l', kg: 1 },
];
const QUANTITY_PATTERN = new RegExp(
  `(?:(\\d+)\\s*[x×*]\\s*)?(\\d+(?:\\.\\d+)?)\\s*(${UNITS.map((unit) => unit.pattern).join('|')})(?![a-zà-ÿ])`,
);
const MAX_KG = 10;

/**
 * Poids lu dans la quantité saisie : « 500 g », « 1,5 kg », « 4 x 125 g », « 75cl », « 250 grammes », « 1 litre ».
 * null si la quantité n’indique pas de poids (« 1 », « 6 »).
 */
export function parseWeightKg(quantity: string): number | null {
  const text = quantity.toLowerCase().replace(',', '.');
  const match = QUANTITY_PATTERN.exec(text);
  if (!match) return null;
  const count = match[1] ? Number(match[1]) : 1;
  const unit = UNITS.find(({ pattern }) => new RegExp(`^(?:${pattern})$`).test(match[3] ?? ''));
  const kg = count * Number(match[2]) * (unit?.kg ?? 0);
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

export function computeImpact(products: readonly Product[], urgentThreshold: number = DEFAULT_URGENT_THRESHOLD): ImpactSummary {
  let savedKg = 0;
  let co2Kg = 0;
  for (const product of products) {
    if (!isRescued(product, urgentThreshold)) continue;
    const kg = estimateWeightKg(product);
    savedKg += kg;
    co2Kg += kg * CO2_PER_KG[product.category];
  }
  return { savedKg, co2Kg, carKm: co2Kg / CAR_CO2_PER_KM };
}

/** « 850 g », « 3,2 kg », « 12 kg ». */
export function formatKg(kg: number): string {
  if (kg < 1) return `${Math.round((kg * 1000) / 10) * 10} g`;
  return `${(kg < 10 ? Math.round(kg * 10) / 10 : Math.round(kg)).toString().replace('.', ',')} kg`;
}
