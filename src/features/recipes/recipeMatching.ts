import type { Recipe, RecipeIngredient } from '@/types/content';
import type { Product } from '@/types/product';
import { daysUntil } from '@/utils/date';
import { getExpiryLevel } from '@/utils/expiry';
import { headMatches, parseFoodName } from '@/utils/foodName';

import { matchIngredient, recipeCoverage, recipeKeywords, type RecipeCoverage } from './recipeIngredients';

export interface RecipeMatch {
  recipe: Recipe;
  score: number;
  /** Produits urgents (≤ 3 jours, non périmés) dont le nom correspond à un ingrédient de la recette. */
  urgentProducts: Product[];
  /** Autres produits actifs dont le nom correspond à un ingrédient. */
  otherProducts: Product[];
  /** Ingrédients indispensables déjà disponibles. */
  coverage: RecipeCoverage;
}

type Relevance = 'ingredient' | 'category' | 'none';

const INGREDIENT_WEIGHT = 3;
const CATEGORY_WEIGHT = 0.5;
const URGENCY_MULTIPLIER = 4;

/** Bonus quand presque tout est déjà là : on cuisine sans passer par les courses. */
const COVERAGE_WEIGHT = 2;

/**
 * Pertinence d’un produit pour une recette. Seul l’aliment principal du nom compte :
 * « Petits pains au beurre » se cuisine comme du pain, pas comme du beurre.
 * La catégorie ne sert qu’à départager le classement.
 */
export function productRelevance(recipe: Recipe, product: Product): Relevance {
  const parsed = parseFoodName(product.name);
  if (recipeKeywords(recipe).some((keyword) => headMatches(parsed, keyword))) return 'ingredient';
  return recipe.categories.includes(product.category) ? 'category' : 'none';
}

/**
 * Classe les recettes selon les produits actifs. Les produits qui périment bientôt
 * comptent davantage ; les produits déjà périmés sont ignorés par prudence.
 */
export function rankRecipes(
  recipes: readonly Recipe[],
  activeProducts: readonly Product[],
  now: Date = new Date(),
  threshold?: number,
): RecipeMatch[] {
  const usable = activeProducts
    .filter((p) => p.status === 'active')
    .map((product) => ({ product, level: getExpiryLevel(daysUntil(product.expiresAt, now), threshold) }))
    .filter(({ level }) => level !== 'expired');
  const fresh = usable.map(({ product }) => product);

  return recipes
    .map((recipe) => {
      let score = 0;
      const urgentProducts: Product[] = [];
      const otherProducts: Product[] = [];

      for (const { product, level } of usable) {
        const relevance = productRelevance(recipe, product);
        if (relevance === 'none') continue;
        const urgency = level === 'urgent' ? URGENCY_MULTIPLIER : 1;

        if (relevance === 'category') {
          score += CATEGORY_WEIGHT * urgency;
          continue;
        }
        score += INGREDIENT_WEIGHT * urgency;
        (level === 'urgent' ? urgentProducts : otherProducts).push(product);
      }
      const coverage = recipeCoverage(recipe, fresh);
      if (coverage.total > 0) score += COVERAGE_WEIGHT * (coverage.have / coverage.total) ** 2;
      return { recipe, score, urgentProducts, otherProducts, coverage };
    })
    .sort((a, b) => b.score - a.score || a.recipe.title.localeCompare(b.recipe.title, 'fr'));
}

/**
 * Sélectionne les recettes à mettre en avant : en priorité celles qui écoulent des produits
 * urgents pas encore couverts par une recette déjà retenue, puis les meilleurs scores restants.
 */
export function pickPriorityRecipes(ranked: readonly RecipeMatch[], max: number): RecipeMatch[] {
  const candidates = ranked.filter((match) => match.urgentProducts.length > 0);
  const picked: RecipeMatch[] = [];
  const covered = new Set<string>();

  for (const match of candidates) {
    if (picked.length >= max) break;
    if (match.urgentProducts.some((p) => !covered.has(p.id))) {
      picked.push(match);
      match.urgentProducts.forEach((p) => covered.add(p.id));
    }
  }
  for (const match of candidates) {
    if (picked.length >= max) break;
    if (!picked.includes(match)) picked.push(match);
  }
  return picked;
}

/** Ingrédient « en stock » si l’aliment principal d’un produit (encore bon) y correspond. */
export function ingredientInStock(ingredient: RecipeIngredient, products: readonly Product[]): boolean {
  return matchIngredient(ingredient, products) !== undefined;
}

/**
 * Produits actifs qu’une recette permet d’utiliser (correspondance de nom), les plus urgents d’abord.
 * Les produits périmés sont exclus par prudence : on ne propose jamais de les cuisiner.
 */
export function productsForRecipe(recipe: Recipe, products: readonly Product[], now: Date = new Date()): Product[] {
  return products
    .filter((p) => p.status === 'active' && daysUntil(p.expiresAt, now) >= 0 && productRelevance(recipe, p) === 'ingredient')
    .sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
}
