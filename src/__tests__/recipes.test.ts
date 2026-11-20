import { RECIPES } from '@/data/recipes';
import { RECIPE_IMAGES } from '@/data/foodImages';
import {
  formatIngredient,
  recipeCoverage,
  recipeMatchesQuery,
  scaleQuantity,
  stepTimerMinutes,
} from '@/features/recipes/recipeIngredients';
import { rankRecipes } from '@/features/recipes/recipeMatching';
import type { Product } from '@/types/product';

const product = (name: string, overrides: Partial<Product> = {}): Product => ({
  id: name,
  name,
  category: 'autre',
  quantity: '1',
  expiresAt: '2026-10-25',
  location: 'frigo',
  source: 'manual',
  status: 'active',
  addedAt: '2026-10-01T08:00:00.000Z',
  updatedAt: '2026-10-01T08:00:00.000Z',
  ...overrides,
});

const recipe = (id: string) => {
  const found = RECIPES.find((r) => r.id === id);
  if (!found) throw new Error(id);
  return found;
};

describe('catalogue de recettes', () => {
  it('a des identifiants uniques, une photo, des étapes et des portions', () => {
    const ids = RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(RECIPES.length).toBeGreaterThanOrEqual(35);
    for (const r of RECIPES) {
      expect(RECIPE_IMAGES[r.id]).toBeTruthy();
      expect(r.steps.length).toBeGreaterThan(1);
      expect(r.servings).toBeGreaterThan(0);
      expect(r.ingredients.some((i) => !i.optional)).toBe(true);
    }
  });
});

describe('portions', () => {
  it('recalcule les quantités avec des arrondis pratiques', () => {
    expect(scaleQuantity({ name: 'farine', qty: 250, unit: 'g' }, 0.5)).toBe(130);
    expect(scaleQuantity({ name: 'lait', qty: 50, unit: 'cl' }, 0.5)).toBe(25);
    expect(scaleQuantity({ name: 'œufs', qty: 3 }, 0.5)).toBe(1.5);
    expect(scaleQuantity({ name: 'œufs', qty: 1 }, 0.25)).toBe(0.5);
    expect(scaleQuantity({ name: 'restes' }, 2)).toBeUndefined();
  });

  it('affiche fractions, singulier et précisions', () => {
    expect(formatIngredient({ name: 'œufs', one: 'œuf', qty: 3 }, 2, 4)).toEqual({ amount: '1 ½', label: 'œufs' });
    expect(formatIngredient({ name: 'œufs', one: 'œuf', qty: 2 }, 2, 4)).toEqual({ amount: '1', label: 'œuf' });
    expect(formatIngredient({ name: 'riz cuit', note: 'de la veille', qty: 300, unit: 'g' }, 2, 2)).toEqual({
      amount: '300 g',
      label: 'de riz cuit (de la veille)',
    });
    expect(formatIngredient({ name: 'huile', qty: 0.5, unit: 'pot' }, 16, 8).amount).toBe('1 pot');
    expect(formatIngredient({ name: 'herbes' }, 4, 2)).toEqual({ amount: null, label: 'herbes' });
    expect(formatIngredient({ name: 'huile d’olive', qty: 8, unit: 'cl' }, 4, 4).label).toBe('d’huile d’olive');
  });
});

describe('couverture et classement', () => {
  it('compte les ingrédients indispensables disponibles', () => {
    const coverage = recipeCoverage(recipe('omelette'), [product('Œufs'), product('Courgettes'), product('Emmental râpé')]);
    expect(coverage).toMatchObject({ have: 3, total: 3, missing: [] });
    expect(recipeCoverage(recipe('omelette'), [product('Œufs')]).have).toBe(1);
  });

  it('fait remonter une recette prête quand rien ne presse', () => {
    const stock = [product('Œufs'), product('Lait demi-écrémé'), product('Farine de blé'), product('Beurre doux')];
    const ranked = rankRecipes(RECIPES, stock, new Date(2026, 9, 15, 12));
    const top = ranked.slice(0, 3).map((m) => m.recipe.id);
    expect(top).toContain('crepes');
    expect(ranked.find((m) => m.recipe.id === 'crepes')?.coverage).toMatchObject({ have: 4, total: 4 });
  });
});

describe('mode cuisine et recherche', () => {
  it('repère la durée à minuter dans une étape', () => {
    expect(stepTimerMinutes('Couvrez d’eau et laissez cuire 25 minutes.')).toBe(25);
    expect(stepTimerMinutes('Laissez cuire 12 à 15 minutes en remuant.')).toBe(15);
    expect(stepTimerMinutes('Réservez au frais au moins 1 heure.')).toBe(60);
    expect(stepTimerMinutes('Préchauffez le four à 180 °C.')).toBeNull();
  });

  it('cherche dans le titre et les ingrédients, sans accents', () => {
    expect(recipeMatchesQuery(recipe('banana-bread'), 'banane')).toBe(true);
    expect(recipeMatchesQuery(recipe('ratatouille'), 'aubergine')).toBe(true);
    expect(recipeMatchesQuery(recipe('crepes'), 'creme')).toBe(false);
    expect(recipeMatchesQuery(recipe('crepes'), '')).toBe(true);
  });
});
