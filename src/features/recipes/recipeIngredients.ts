import type { Recipe, RecipeIngredient } from '@/types/content';
import type { Product } from '@/types/product';
import { headMatches, keywordTokens, parseFoodName } from '@/utils/foodName';
import { normalizeText } from '@/utils/text';

/** Mots-clés d’un ingrédient : la liste `match`, sinon son nom. */
const ingredientKeywords = (ingredient: RecipeIngredient): string[] => ingredient.match ?? [ingredient.name];

const KEYWORDS = new Map<string, string[][]>();

/** Mots-clés (normalisés, mis en cache) qui relient une recette aux produits du frigo. */
export function recipeKeywords(recipe: Recipe): string[][] {
  let cached = KEYWORDS.get(recipe.id);
  if (!cached) {
    const all = new Set([...recipe.ingredients.flatMap(ingredientKeywords), ...(recipe.keywords ?? [])].map(normalizeText));
    cached = [...all].map(keywordTokens).filter((tokens) => tokens.length > 0);
    KEYWORDS.set(recipe.id, cached);
  }
  return cached;
}

/**
 * Premier produit qui correspond à l’ingrédient (aliment principal du nom) :
 * « Riz basmati » couvre le riz, « Petits pains au beurre » ne couvre pas le beurre.
 */
export function matchIngredient(ingredient: RecipeIngredient, products: readonly Product[]): Product | undefined {
  const keywords = ingredientKeywords(ingredient).map(keywordTokens);
  return products.find((product) => {
    const parsed = parseFoodName(product.name);
    return keywords.some((keyword) => headMatches(parsed, keyword));
  });
}

export interface RecipeCoverage {
  /** Ingrédients indispensables disponibles. */
  have: number;
  /** Nombre d’ingrédients indispensables (les facultatifs ne comptent pas). */
  total: number;
  missing: RecipeIngredient[];
}

/** Ce qu’il vous manque pour cuisiner la recette avec les produits encore bons. */
export function recipeCoverage(recipe: Recipe, freshProducts: readonly Product[]): RecipeCoverage {
  const required = recipe.ingredients.filter((ingredient) => !ingredient.optional);
  const missing = required.filter((ingredient) => !matchIngredient(ingredient, freshProducts));
  return { have: required.length - missing.length, total: required.length, missing };
}

const FRACTIONS: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾' };

/** Quantité recalculée pour un autre nombre de personnes, arrondie à une valeur pratique. */
export function scaleQuantity(ingredient: RecipeIngredient, factor: number): number | undefined {
  if (ingredient.qty === undefined) return undefined;
  const raw = ingredient.qty * factor;
  const unit = ingredient.unit ?? '';
  if (unit === 'g' || unit === 'ml') return raw < 50 ? Math.max(5, Math.round(raw / 5) * 5) : Math.round(raw / 10) * 10;
  if (unit === 'cl') return Math.max(1, Math.round(raw));
  if (unit === 'kg' || unit === 'l') return Math.round(raw * 4) / 4 || 0.25;
  // Pièces, cuillères, pots : au demi près, jamais zéro.
  return Math.max(0.5, Math.round(raw * 2) / 2);
}

function formatNumber(value: number): string {
  const whole = Math.floor(value);
  const fraction = FRACTIONS[(value - whole).toFixed(2).replace(/0$/, '')];
  if (fraction) return whole === 0 ? fraction : `${whole} ${fraction}`;
  return String(Math.round(value * 100) / 100).replace('.', ',');
}

export interface FormattedIngredient {
  /** « 200 g », « 3 », « ½ c. à s. » ; null si la quantité est libre. */
  amount: string | null;
  label: string;
}

/** Ingrédient affiché pour `servings` personnes (« 2 œufs », « 1 œuf », « 150 g de… » géré par le nom). */
export function formatIngredient(ingredient: RecipeIngredient, servings: number, baseServings: number): FormattedIngredient {
  const qty = scaleQuantity(ingredient, servings / baseServings);
  const name = qty !== undefined && qty <= 1 && !ingredient.unit && ingredient.one ? ingredient.one : ingredient.name;
  const base = ingredient.note ? `${name} (${ingredient.note})` : name;
  if (qty === undefined) return { amount: null, label: base };
  // « 250 g de farine », « 8 cl d’huile » : la préposition suit une unité, pas un nombre de pièces.
  const label = ingredient.unit ? `${/^[aeiouyhéèêâîœ]/i.test(base) ? 'd’' : 'de '}${base}` : base;
  const unit = ingredient.unit ? (qty > 1 && ingredient.unit === 'pot' ? 'pots' : ingredient.unit) : '';
  return { amount: unit ? `${formatNumber(qty)} ${unit}` : formatNumber(qty), label };
}

/** Texte d’un article de liste de courses : « 200 g », « 3 »… */
export function shoppingQuantity(ingredient: RecipeIngredient, servings: number, baseServings: number): string {
  return formatIngredient(ingredient, servings, baseServings).amount ?? '';
}

/** Durée à minuter repérée dans une étape (« 25 minutes », « 12 à 15 minutes » → la plus longue). */
export function stepTimerMinutes(step: string): number | null {
  const match = /(\d+)(?:\s*(?:à|-)\s*(\d+))?\s*(?:min\b|minutes?)/i.exec(step);
  if (match) return Number(match[2] ?? match[1]);
  const hours = /(\d+)\s*heures?/i.exec(step);
  return hours ? Number(hours[1]) * 60 : null;
}

/** Recherche dans le titre, la description et les ingrédients (sans accents). */
export function recipeMatchesQuery(recipe: Recipe, query: string): boolean {
  const needle = normalizeText(query);
  if (!needle) return true;
  const haystack = normalizeText(
    [recipe.title, recipe.description, ...recipe.ingredients.flatMap((i) => [i.name, i.note ?? '', ...(i.match ?? [])])].join(' '),
  );
  return needle.split(' ').every((word) => haystack.includes(word));
}
