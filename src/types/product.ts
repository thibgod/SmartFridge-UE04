export type ProductStatus = 'active' | 'consumed' | 'discarded';

export type ClosedProductStatus = Exclude<ProductStatus, 'active'>;

export type ProductLocation = 'frigo' | 'congelateur' | 'placard';

export type ProductCategory =
  | 'fruits_legumes'
  | 'viande_poisson'
  | 'produits_laitiers'
  | 'feculents'
  | 'plats_prepares'
  | 'autre';

export type ProductSource = 'manual' | 'open_food_facts';

/** Date calendaire locale au format YYYY-MM-DD (sans heure ni fuseau). */
export type LocalDateString = string;

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  quantity: string;
  expiresAt: LocalDateString;
  location: ProductLocation;
  price?: number;
  imageUri?: string;
  barcode?: string;
  brand?: string;
  notes?: string;
  source: ProductSource;
  status: ProductStatus;
  addedAt: string; // ISO
  updatedAt: string; // ISO
  closedAt?: string; // ISO
  /** Date (YYYY-MM-DD) à laquelle le produit a été entamé. */
  openedAt?: LocalDateString;
  /** Part restante (0 à 1, exclus) après une utilisation partielle ; absente = produit entier. */
  remaining?: number;
  /** Lieu (Premium : bureau, résidence secondaire…) ; absent = la maison. */
  placeId?: string;
}

/** Données saisies par l’utilisateur pour créer ou modifier un produit. */
export interface ProductInput {
  name: string;
  category: ProductCategory;
  quantity: string;
  expiresAt: LocalDateString;
  location: ProductLocation;
  price?: number;
  imageUri?: string;
  barcode?: string;
  brand?: string;
  notes?: string;
  source: ProductSource;
  openedAt?: LocalDateString;
  remaining?: number;
  placeId?: string;
}

/** Filtre d’emplacement de l’écran « Mon frigo ». */
export type LocationFilter = 'all' | ProductLocation;
