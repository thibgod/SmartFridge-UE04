import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

import type { ProductCategory } from './product';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type RecipeDifficulty = 'facile' | 'moyen';

export type RecipeTag = 'vegetarien' | 'sans-four' | 'dessert' | 'enfants' | 'batch';

export interface RecipeIngredient {
  /** Nom affiché, au pluriel si la quantité le demande (« œufs »). */
  name: string;
  /** Forme au singulier quand la quantité vaut 1 ou moins (« œuf »). */
  one?: string;
  /** Quantité pour `servings` personnes ; absente = « selon vos restes ». */
  qty?: number;
  /** Unité (« g », « cl », « c. à s. »…) ; absente = nombre de pièces. */
  unit?: string;
  optional?: boolean;
  /** Produits qui conviennent, quand le nom est générique (« légumes » → carotte, courgette…). */
  match?: string[];
  /** Précision affichée après le nom (« de la veille »). */
  note?: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  durationMinutes: number;
  difficulty: RecipeDifficulty;
  /** Nombre de personnes pour les quantités indiquées. */
  servings: number;
  ingredients: RecipeIngredient[];
  steps: string[];
  tags: RecipeTag[];
  /** Astuce anti-gaspi ou de conservation. */
  tip?: string;
  /** Catégories de produits que la recette permet d’écouler. */
  categories: ProductCategory[];
  /** Mots-clés supplémentaires (sans accents) en plus des ingrédients, pour reconnaître les produits. */
  keywords?: string[];
}

export interface TipSection {
  heading?: string;
  bullets: string[];
}

export interface Tip {
  id: string;
  title: string;
  subtitle: string;
  icon: IconName;
  tone: 'green' | 'amber' | 'blue' | 'rose' | 'sand' | 'mint';
  intro: string;
  sections: TipSection[];
  /** Message de prudence facultatif, mis en évidence. */
  caution?: string;
}

/** Crédit d’une photo sous licence libre : à afficher avec la photo (CC BY, CC BY-SA…). */
export interface ImageCredit {
  author: string;
  /** Nom court de la licence (« CC BY-SA 4.0 », « Public domain »). */
  license: string;
  licenseUrl?: string;
  /** Page de la photo (source et détails de la licence). */
  page: string;
}
