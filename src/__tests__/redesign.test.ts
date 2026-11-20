import { planFreeze, planOpen, planThaw } from '@/features/products/smartActions';
import { ingredientInStock, productsForRecipe } from '@/features/recipes/recipeMatching';
import { niceMax } from '@/utils/chart';
import { RECIPES } from '@/data/recipes';
import { buildHeadline } from '@/hooks/useInventory';
import {
  findCatalogImage,
  imageCacheKey,
  isFoodDescription,
  isRelevantPage,
  pickRelevantImage,
} from '@/services/images/foodImages';
import type { Product } from '@/types/product';
import { frequentProducts } from '@/utils/products';
import { antiWasteScore, comparePeriods, monthlyAmounts, repeatedlyDiscarded } from '@/utils/stats';

const product = (overrides: Partial<Product>): Product => ({
  id: 'p',
  name: 'Produit',
  category: 'autre',
  quantity: '1',
  expiresAt: '2026-10-20',
  location: 'frigo',
  source: 'manual',
  status: 'active',
  addedAt: '2026-10-01T08:00:00.000Z',
  updatedAt: '2026-10-01T08:00:00.000Z',
  ...overrides,
});

const TODAY = '2026-10-15';

describe('gestes anti-gaspi', () => {
  it('congeler déplace au congélateur et prolonge la date', () => {
    const plan = planFreeze(product({ category: 'viande_poisson', expiresAt: '2026-10-16' }), TODAY);
    expect(plan?.input.location).toBe('congelateur');
    expect(plan?.newExpiresAt).toBe('2027-02-12'); // + 120 jours
  });

  it('refuse de congeler un produit périmé ou déjà congelé', () => {
    expect(planFreeze(product({ expiresAt: '2026-10-14' }), TODAY)).toBeNull();
    expect(planFreeze(product({ location: 'congelateur' }), TODAY)).toBeNull();
  });

  it('sortir du congélateur impose de consommer sous 24 h', () => {
    const plan = planThaw(product({ location: 'congelateur', expiresAt: '2027-01-01' }), TODAY);
    expect(plan?.input.location).toBe('frigo');
    expect(plan?.newExpiresAt).toBe('2026-10-16');
  });

  it('entamer raccourcit la date sans jamais l’allonger', () => {
    const yogurt = planOpen(product({ category: 'produits_laitiers', expiresAt: '2026-10-30' }), TODAY);
    expect(yogurt?.input.openedAt).toBe(TODAY);
    expect(yogurt?.newExpiresAt).toBe('2026-10-18');
    const soon = planOpen(product({ category: 'produits_laitiers', expiresAt: '2026-10-16' }), TODAY);
    expect(soon?.newExpiresAt).toBe('2026-10-16');
    expect(planOpen(product({ openedAt: '2026-10-10' }), TODAY)).toBeNull();
    expect(planOpen(product({ location: 'placard' }), TODAY)).toBeNull();
  });
});

describe('illustrations', () => {
  it('trouve les aliments courants dans le catalogue vérifié', () => {
    expect(findCatalogImage('Bananes bio')).toContain('Banana_on_black_background.jpg');
    expect(findCatalogImage('Blancs de poulet')).toContain('Raw%20chicken%20slices.jpg');
    expect(findCatalogImage('Pommes de terre')).toContain('Patates.jpg');
    expect(findCatalogImage('Pommes Golden')).toContain('Red%20Apple.jpg');
    expect(findCatalogImage('Produit mystère')).toBeNull();
  });

  it('normalise la clé de cache', () => {
    expect(imageCacheKey('Yaourts  Nature')).toBe(imageCacheKey('yaourt nature'));
  });

  it('écarte les pages Wikipédia hors sujet', () => {
    expect(isRelevantPage('Moutarde', 'Gaz moutarde')).toBe(false);
    expect(isRelevantPage('Moutarde', 'Moutarde (condiment)')).toBe(true);
    expect(isRelevantPage('Basilic', 'Basilic (mythologie)')).toBe(false);
    expect(isRelevantPage('Basilic', 'Basilic (plante)')).toBe(true);
    expect(isRelevantPage('Yaourts nature', 'Yaourt')).toBe(true);
    expect(isRelevantPage('XYZ inconnu', 'Titof')).toBe(false);
  });

  it('reconnaît les descriptions Wikipédia d’aliments (relevées sur fr.wikipedia.org)', () => {
    for (const food of [
      'fruit du bananier',
      'fruit vert de la famille des Cucurbitaceae',
      'variété de plantes',
      'charcuterie composée d’un hachis de viande assaisonnée',
      'pain qui se caractérise par son absence de croûte croustillante',
      'boisson alcoolisée obtenue par distillation',
    ]) {
      expect(isFoodDescription(food)).toBe(true);
    }
    for (const other of [
      'prénom épicène',
      'acteur australien',
      'page d’homonymie de Wikimédia',
      'commune française',
      undefined,
    ]) {
      expect(isFoodDescription(other)).toBe(false);
    }
  });

  it('choisit la première page pertinente avec une image', () => {
    const url = pickRelevantImage('Moutarde', [
      { title: 'Gaz moutarde', index: 1, thumbnail: { source: 'gaz.jpg' }, description: 'arme chimique' },
      {
        title: 'Moutarde (condiment)',
        index: 2,
        thumbnail: { source: 'condiment.jpg' },
        description: 'condiment à base de graines',
      },
    ]);
    expect(url).toBe('condiment.jpg');
    // Un nom qui n’est pas un aliment ne doit jamais afficher la photo d’une personne.
    expect(
      pickRelevantImage('Chris', [
        { title: 'Chris', index: 1, thumbnail: { source: 'acteur.jpg' }, description: 'prénom épicène' },
        { title: 'Chris Hemsworth', index: 2, thumbnail: { source: 'acteur2.jpg' }, description: 'acteur australien' },
      ]),
    ).toBeNull();
    expect(
      pickRelevantImage('Rillettes', [
        {
          title: 'Rillettes',
          index: 1,
          thumbnail: { source: 'r.jpg' },
          description: 'préparation de viande ou de poisson cuite',
        },
      ]),
    ).toBe('r.jpg');
    expect(pickRelevantImage('Banane', [{ title: 'Banane', index: 1, thumbnail: { source: 'b.jpg' } }])).toBeNull();
    expect(pickRelevantImage('Moule', [{ title: 'Moule', index: 1 }])).toBeNull();
  });
});

describe('accueil', () => {
  const now = new Date(2026, 9, 15, 10);
  it('résume la journée en une phrase', () => {
    expect(buildHeadline({ expired: 0, urgent: 0, ok: 0 }, [], 0, now)).toMatch(/premiers produits/);
    expect(buildHeadline({ expired: 0, urgent: 1, ok: 2 }, [product({ name: 'Lait', expiresAt: '2026-10-16' })], 3, now)).toBe(
      '« Lait » périme demain.',
    );
    expect(buildHeadline({ expired: 1, urgent: 3, ok: 0 }, [], 4, now)).toBe('3 produits à consommer rapidement · 1 à vérifier.');
    expect(buildHeadline({ expired: 0, urgent: 0, ok: 5 }, [], 5, now)).toMatch(/sous contrôle/);
  });

  it('propose les produits les plus achetés pour l’ajout express', () => {
    const items = frequentProducts([
      product({ id: 'a', name: 'Lait', addedAt: '2026-10-01T00:00:00Z' }),
      product({ id: 'b', name: 'lait', addedAt: '2026-10-05T00:00:00Z' }),
      product({ id: 'c', name: 'Œufs', addedAt: '2026-10-07T00:00:00Z' }),
    ]);
    expect(items.map((i) => [i.latest.id, i.count])).toEqual([
      ['b', 2],
      ['c', 1],
    ]);
  });
});

describe('bilan', () => {
  const now = new Date(2026, 9, 15, 12);
  const closed = (id: string, status: 'consumed' | 'discarded', daysAgo: number, extra: Partial<Product> = {}) =>
    product({ id, name: id, status, closedAt: new Date(now.getTime() - daysAgo * 86_400_000).toISOString(), ...extra });

  it('compare avec la période précédente', () => {
    const items = [
      closed('a', 'consumed', 2),
      closed('b', 'discarded', 5),
      closed('c', 'consumed', 40),
      closed('d', 'consumed', 45),
    ];
    const { current, previous } = comparePeriods(items, '30d', now);
    expect(current.consumedCount).toBe(1);
    expect(previous?.consumedCount).toBe(2);
    expect(antiWasteScore(current)).toBe(50);
    expect(antiWasteScore(previous!)).toBe(100);
    expect(comparePeriods(items, 'all', now).previous).toBeNull();
  });

  it('repère les produits jetés à répétition', () => {
    const items = [
      closed('1', 'discarded', 1, { name: 'Bananes', category: 'fruits_legumes' }),
      closed('2', 'discarded', 3, { name: 'bananes', category: 'fruits_legumes' }),
      closed('3', 'discarded', 4, { name: 'Lait' }),
    ];
    expect(repeatedlyDiscarded(items)).toEqual([{ name: 'Bananes', count: 2, category: 'fruits_legumes' }]);
  });

  it('cumule les montants par mois', () => {
    const items = [closed('a', 'consumed', 1, { price: 2.5 }), closed('b', 'discarded', 1, { price: 1.2 })];
    expect(monthlyAmounts(items, 6, now).at(-1)).toMatchObject({ consumedCents: 250, discardedCents: 120 });
  });
});

describe('recettes', () => {
  it('coche les ingrédients en stock et liste les produits utilisables', () => {
    const stock = [
      product({ id: 'c', name: 'Courgettes', expiresAt: '2026-10-16' }),
      product({ id: 'old', name: 'Courgette', expiresAt: '2026-10-10' }),
      product({ id: 'e', name: 'Œufs' }),
    ];
    const soupIngredients = RECIPES.find((r) => r.id === 'soupe-legumes')?.ingredients ?? [];
    expect(ingredientInStock(soupIngredients[0]!, stock)).toBe(true); // légumes variés
    expect(ingredientInStock({ name: 'cubes de bouillon' }, stock)).toBe(false);
    const soup = RECIPES.find((r) => r.id === 'soupe-legumes');
    // La courgette périmée n’est jamais proposée.
    expect(soup && productsForRecipe(soup, stock, new Date(2026, 9, 15, 12)).map((p) => p.id)).toEqual(['c']);
  });
});

describe('graphique', () => {
  it('arrondit l’axe juste au-dessus du maximum', () => {
    expect(niceMax(22)).toBe(25);
    expect(niceMax(7)).toBe(8);
    expect(niceMax(130)).toBe(150);
    expect(niceMax(0)).toBe(1);
  });
});
