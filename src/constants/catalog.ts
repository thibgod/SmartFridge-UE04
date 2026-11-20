import type { IconName } from '@/types/content';
import type { ProductCategory, ProductLocation } from '@/types/product';

interface Tone {
  fg: string;
  bg: string;
}

interface CategoryMeta {
  label: string;
  shortLabel: string;
  icon: IconName;
  light: Tone;
  dark: Tone;
}

export const CATEGORIES: Record<ProductCategory, CategoryMeta> = {
  fruits_legumes: {
    label: 'Fruits / légumes',
    shortLabel: 'Fruits & légumes',
    icon: 'nutrition-outline',
    light: { fg: '#3E7B3A', bg: '#E4F1DF' },
    dark: { fg: '#9AD48F', bg: '#1F3320' },
  },
  viande_poisson: {
    label: 'Viande / poisson',
    shortLabel: 'Viande & poisson',
    icon: 'fish-outline',
    light: { fg: '#A3473A', bg: '#F8E3DF' },
    dark: { fg: '#F2A598', bg: '#3A2220' },
  },
  produits_laitiers: {
    label: 'Produits laitiers',
    shortLabel: 'Laitiers',
    icon: 'water-outline',
    light: { fg: '#2B5F8A', bg: '#E2EDF6' },
    dark: { fg: '#9CC8EE', bg: '#1A2B3A' },
  },
  feculents: {
    label: 'Féculents',
    shortLabel: 'Féculents',
    icon: 'leaf-outline',
    light: { fg: '#8A6420', bg: '#F5EBD5' },
    dark: { fg: '#E6C483', bg: '#33291A' },
  },
  plats_prepares: {
    label: 'Plats préparés',
    shortLabel: 'Plats préparés',
    icon: 'restaurant-outline',
    light: { fg: '#7A4C8C', bg: '#EFE4F3' },
    dark: { fg: '#D2A9E2', bg: '#2E2236' },
  },
  autre: {
    label: 'Autre',
    shortLabel: 'Autre',
    icon: 'basket-outline',
    light: { fg: '#5C665F', bg: '#ECEAE3' },
    dark: { fg: '#B9C2BC', bg: '#252D28' },
  },
};

export function categoryTone(category: ProductCategory, isDark: boolean): Tone {
  const meta = CATEGORIES[category];
  return isDark ? meta.dark : meta.light;
}

export const CATEGORY_ORDER: ProductCategory[] = [
  'fruits_legumes',
  'viande_poisson',
  'produits_laitiers',
  'feculents',
  'plats_prepares',
  'autre',
];

interface LocationMeta {
  label: string;
  shortLabel: string;
  icon: IconName;
}

export const LOCATIONS: Record<ProductLocation, LocationMeta> = {
  frigo: { label: 'Frigo', shortLabel: 'Frigo', icon: 'thermometer-outline' },
  congelateur: { label: 'Congélateur', shortLabel: 'Congél.', icon: 'snow-outline' },
  placard: { label: 'Placard', shortLabel: 'Placard', icon: 'file-tray-stacked-outline' },
};

export const LOCATION_ORDER: ProductLocation[] = ['frigo', 'congelateur', 'placard'];
