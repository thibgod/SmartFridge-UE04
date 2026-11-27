import { RECIPES } from '@/data/recipes';
import { buildDemoProducts } from '@/__fixtures__/demoProducts';
import { pickPriorityRecipes, productRelevance, rankRecipes } from '@/features/recipes/recipeMatching';
import { getReminderDate, planReminders } from '@/services/notifications';
import type { Product } from '@/types/product';

const product = (overrides: Partial<Product>): Product => ({
  id: 'p',
  name: 'Produit',
  category: 'autre',
  quantity: '1',
  expiresAt: '2026-10-20',
  location: 'frigo',
  source: 'manual',
  status: 'active',
  addedAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
  ...overrides,
});

const recipe = (id: string) => {
  const found = RECIPES.find((r) => r.id === id);
  if (!found) throw new Error(id);
  return found;
};

describe('matching des recettes', () => {
  it('reconnaît un mot entier (pluriel, accents) mais pas un préfixe', () => {
    expect(productRelevance(recipe('omelette'), product({ name: 'Œufs bio' }))).toBe('ingredient');
    expect(productRelevance(recipe('smoothie'), product({ name: 'Laitue', category: 'autre' }))).toBe('none');
    expect(productRelevance(recipe('quiche'), product({ name: 'Bananes', category: 'fruits_legumes' }))).toBe('category');
  });

  it('met en avant les recettes qui utilisent les produits urgents, en ignorant les périmés', () => {
    const now = new Date(2026, 9, 14, 9);
    const ranked = rankRecipes(
      RECIPES,
      [
        product({ id: 'a', name: 'Bananes', category: 'fruits_legumes', expiresAt: '2026-10-15' }),
        product({ id: 'b', name: 'Jambon', category: 'viande_poisson', expiresAt: '2026-10-10' }),
      ],
      now,
    );
    expect(ranked[0]?.recipe.id).toBe('smoothie');
    expect(ranked[0]?.urgentProducts.map((p) => p.id)).toEqual(['a']);
    expect(ranked.every((m) => !m.urgentProducts.some((p) => p.id === 'b'))).toBe(true);
    // Une simple catégorie compatible ne vaut pas « idéal pour ».
    expect(ranked.find((m) => m.recipe.id === 'quiche')?.urgentProducts).toEqual([]);
  });
});

describe('sélection des recettes prioritaires', () => {
  it('couvre un maximum de produits urgents différents', () => {
    const products = buildDemoProducts('2026-10-14').map((input, i) => product({ ...input, id: String(i) }));
    const ranked = rankRecipes(RECIPES, products, new Date(2026, 9, 14, 12));
    const picked = pickPriorityRecipes(ranked, 3);
    const covered = new Set(picked.flatMap((m) => m.urgentProducts.map((p) => p.name)));
    expect(picked).toHaveLength(3);
    expect([...covered].sort()).toEqual(['Bananes', 'Blancs de poulet', 'Courgettes', 'Crème fraîche', 'Yaourts nature']);
  });
});

describe('planification des rappels', () => {
  it('programme la veille à 9 h, heure locale', () => {
    const date = getReminderDate(product({ expiresAt: '2026-10-20' }));
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2026, 9, 19, 9]);
  });

  it('ignore les produits clôturés, périmés ou dont le rappel est déjà passé', () => {
    const now = new Date(2026, 9, 14, 12);
    const plans = planReminders(
      [
        product({ id: 'ok', name: 'Lait', expiresAt: '2026-10-20' }),
        product({ id: 'tomorrow', expiresAt: '2026-10-15' }), // rappel le 14 à 9 h : déjà passé
        product({ id: 'expired', expiresAt: '2026-10-10' }),
        product({ id: 'closed', expiresAt: '2026-10-25', status: 'consumed' }),
      ],
      undefined,
      now,
    );
    expect(plans.map((p) => p.identifier)).toEqual(['expiry-day-2026-10-19']);
    expect(plans[0]?.title).toBe('Lait périme demain !');
  });

  it('respecte les réglages : heure, jours d’avance et désactivation', () => {
    const now = new Date(2026, 9, 14, 12);
    const milk = product({ id: 'm', name: 'Lait', expiresAt: '2026-10-20' });
    const [plan] = planReminders([milk], { enabled: true, hour: 18, daysBefore: 2 }, now);
    expect(plan?.title).toBe('Lait périme dans 2 jours !');
    expect([plan?.triggerAt.getDate(), plan?.triggerAt.getHours()]).toEqual([18, 18]);
    expect(planReminders([milk], { enabled: false, hour: 9, daysBefore: 1 }, now)).toEqual([]);
  });

  it('regroupe les produits qui périment le même jour en un seul rappel', () => {
    const now = new Date(2026, 9, 14, 12);
    const plans = planReminders(
      ['Yaourts', 'Lait', 'Crème', 'Jambon', 'Beurre'].map((name, i) =>
        product({ id: String(i), name, expiresAt: '2026-10-20' }),
      ),
      undefined,
      now,
    );
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({
      title: '5 produits périment demain',
      body: 'Beurre, Crème, Jambon et 2 autres : pensez à les cuisiner ou à les congeler.',
      productId: undefined,
    });
    expect(plans[0]?.productIds).toHaveLength(5);
  });
});
