import type { ProductCategory, ProductLocation } from '@/types/product';

/**
 * Durées de conservation indicatives et prudentes (en jours) selon la catégorie et l’emplacement,
 * utilisées uniquement pour proposer une date. La date imprimée sur l’emballage prime toujours.
 */
export const SHELF_LIFE_DAYS: Record<ProductLocation, Record<ProductCategory, number>> = {
  frigo: {
    fruits_legumes: 5,
    viande_poisson: 2,
    produits_laitiers: 7,
    feculents: 3, // féculents cuits
    plats_prepares: 3,
    autre: 7,
  },
  congelateur: {
    fruits_legumes: 240,
    viande_poisson: 120,
    produits_laitiers: 60,
    feculents: 90,
    plats_prepares: 90,
    autre: 90,
  },
  placard: {
    fruits_legumes: 7,
    viande_poisson: 365, // conserves
    produits_laitiers: 90, // lait UHT
    feculents: 365,
    plats_prepares: 365, // conserves, plats appertisés
    autre: 180,
  },
};
