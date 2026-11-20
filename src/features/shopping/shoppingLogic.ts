import { CATEGORIES, CATEGORY_ORDER } from '@/constants/catalog';
import { matchIngredient, shoppingQuantity } from '@/features/recipes/recipeIngredients';
import { guessCategory } from '@/services/images/foodImages';
import type { Recipe } from '@/types/content';
import type { Product, ProductCategory } from '@/types/product';
import type { ShoppingItem, ShoppingItemInput } from '@/types/shopping';
import { daysUntil } from '@/utils/date';
import { createId } from '@/utils/id';
import { normalizeText } from '@/utils/text';

export const SHOPPING_NAME_MAX_LENGTH = 60;

const itemKey = (name: string) => normalizeText(name);

/**
 * Prépare les articles à insérer : noms nettoyés, catégorie devinée si absente,
 * doublons ignorés (déjà à acheter dans la liste, ou répétés dans la demande).
 */
export function prepareItems(
  inputs: readonly ShoppingItemInput[],
  existing: readonly ShoppingItem[],
  now: Date = new Date(),
): { items: ShoppingItem[]; duplicates: string[] } {
  const taken = new Set(existing.filter((item) => !item.checked).map((item) => itemKey(item.name)));
  const items: ShoppingItem[] = [];
  const duplicates: string[] = [];

  for (const input of inputs) {
    const name = input.name.trim().replace(/\s+/g, ' ').slice(0, SHOPPING_NAME_MAX_LENGTH);
    const key = itemKey(name);
    if (!key) continue;
    if (taken.has(key)) {
      duplicates.push(name);
      continue;
    }
    taken.add(key);
    items.push({
      id: createId(),
      name,
      category: input.category ?? guessCategory(name) ?? 'autre',
      quantity: (input.quantity ?? '').trim().slice(0, 20),
      checked: false,
      source: input.source ?? 'manual',
      addedAt: now.toISOString(),
    });
  }
  return { items, duplicates };
}

export interface RestockSuggestion {
  name: string;
  category: ProductCategory;
  /** Nombre de fois où le produit a été consommé. */
  consumedCount: number;
}

/**
 * Produits à racheter : déjà achetés au moins deux fois, plus en stock (ou périmés),
 * absents de la liste. Un produit plus souvent jeté que consommé n’est pas proposé :
 * l’app ne pousse pas à racheter ce qui finit à la poubelle.
 */
export function suggestRestock(
  products: readonly Product[],
  items: readonly ShoppingItem[],
  now: Date = new Date(),
  limit = 8,
): RestockSuggestion[] {
  const onList = new Set(items.map((item) => itemKey(item.name)));
  const groups = new Map<
    string,
    { latest: Product; total: number; consumed: number; discarded: number; inStock: boolean; lastClosed: string }
  >();

  for (const product of products) {
    const key = itemKey(product.name);
    if (!key) continue;
    const group = groups.get(key) ?? { latest: product, total: 0, consumed: 0, discarded: 0, inStock: false, lastClosed: '' };
    group.total += 1;
    if (product.addedAt > group.latest.addedAt) group.latest = product;
    if (product.status === 'consumed') group.consumed += 1;
    if (product.status === 'discarded') group.discarded += 1;
    if (product.status === 'active' && daysUntil(product.expiresAt, now) >= 0) group.inStock = true;
    if (product.closedAt && product.closedAt > group.lastClosed) group.lastClosed = product.closedAt;
    groups.set(key, group);
  }

  return [...groups.entries()]
    .filter(([key, g]) => g.total >= 2 && g.consumed >= 1 && g.consumed >= g.discarded && !g.inStock && !onList.has(key))
    .sort(([, a], [, b]) => b.consumed - a.consumed || b.lastClosed.localeCompare(a.lastClosed))
    .slice(0, limit)
    .map(([, g]) => ({ name: g.latest.name, category: g.latest.category, consumedCount: g.consumed }));
}

export interface MissingIngredient {
  name: string;
  /** Quantité pour le nombre de personnes choisi (« 200 g », « 3 »), vide si libre. */
  quantity: string;
}

/**
 * Ingrédients indispensables d’une recette qui manquent : ni en stock (produit actif non périmé),
 * ni déjà sur la liste. Les ingrédients facultatifs sont laissés de côté.
 */
export function missingIngredients(
  recipe: Recipe,
  products: readonly Product[],
  items: readonly ShoppingItem[],
  now: Date = new Date(),
  servings: number = recipe.servings,
): MissingIngredient[] {
  const fresh = products.filter((p) => p.status === 'active' && daysUntil(p.expiresAt, now) >= 0);
  const onList = new Set(items.filter((item) => !item.checked).map((item) => itemKey(item.name)));
  return recipe.ingredients
    .filter((ingredient) => !ingredient.optional && !matchIngredient(ingredient, fresh))
    .map((ingredient) => {
      const quantity = shoppingQuantity(ingredient, servings, recipe.servings);
      const singular = !ingredient.unit && quantity !== '' && Number(quantity.replace(',', '.')) <= 1;
      const name = singular && ingredient.one ? ingredient.one : ingredient.name;
      return { name: name.charAt(0).toUpperCase() + name.slice(1), quantity };
    })
    .filter(({ name }) => !onList.has(itemKey(name)));
}

export interface ShoppingSection {
  category: ProductCategory;
  data: ShoppingItem[];
}

/** Articles à acheter regroupés par rayon, puis le panier (articles cochés, plus récents d’abord). */
export function groupShoppingItems(items: readonly ShoppingItem[]): { sections: ShoppingSection[]; checked: ShoppingItem[] } {
  const pending = items.filter((item) => !item.checked);
  const sections = CATEGORY_ORDER.map((category) => ({
    category,
    data: pending.filter((item) => item.category === category).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
  })).filter((section) => section.data.length > 0);
  const checked = items
    .filter((item) => item.checked)
    .sort((a, b) => (b.checkedAt ?? '').localeCompare(a.checkedAt ?? ''));
  return { sections, checked };
}

/** Texte partagé (Messages, Notes…) : articles restant à acheter, par rayon. */
export function formatShoppingList(items: readonly ShoppingItem[]): string {
  const { sections } = groupShoppingItems(items);
  if (sections.length === 0) return 'Liste de courses vide.';
  const blocks = sections.map((section) => {
    const lines = section.data.map((item) => `• ${item.name}${item.quantity ? ` (${item.quantity})` : ''}`);
    return [CATEGORIES[section.category].shortLabel, ...lines].join('\n');
  });
  return ['🛒 Liste de courses', ...blocks].join('\n\n');
}
