import { RECIPES } from '@/data/recipes';
import { formatShoppingList, groupShoppingItems, missingIngredients, prepareItems } from '@/features/shopping/shoppingLogic';
import { buildBackup, parseBackup } from '@/services/backup/format';
import type { Product } from '@/types/product';
import { DEFAULT_SETTINGS } from '@/types/settings';
import type { ShoppingItem } from '@/types/shopping';

const NOW = new Date(2026, 9, 15, 10);

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

const item = (overrides: Partial<ShoppingItem>): ShoppingItem => ({
  id: 'i',
  name: 'Article',
  category: 'autre',
  quantity: '',
  checked: false,
  source: 'manual',
  addedAt: '2026-10-10T08:00:00.000Z',
  ...overrides,
});

describe('ajout à la liste de courses', () => {
  it('nettoie les noms, devine le rayon et ignore les doublons', () => {
    const { items, duplicates } = prepareItems(
      [{ name: '  Bananes ' }, { name: 'bananes' }, { name: 'Lait' }, { name: '   ' }],
      [item({ name: 'LAIT' })],
      NOW,
    );
    expect(items.map((i) => i.name)).toEqual(['Bananes']);
    expect(items[0]?.category).toBe('fruits_legumes');
    expect(duplicates).toEqual(['bananes', 'Lait']);
  });

  it('autorise à remettre un article déjà dans le panier', () => {
    const { items } = prepareItems([{ name: 'Lait' }], [item({ name: 'Lait', checked: true })], NOW);
    expect(items).toHaveLength(1);
  });
});

describe('ingrédients manquants d’une recette', () => {
  const omelette = RECIPES.find((r) => r.id === 'omelette');
  if (!omelette) throw new Error('omelette');

  it('liste ce qui manque avec la quantité, sans le stock, le facultatif ni ce qui est déjà sur la liste', () => {
    const missing = missingIngredients(
      omelette,
      [product({ name: 'Œufs bio' }), product({ name: 'Fromage râpé', expiresAt: '2026-10-01' })],
      [item({ name: 'Restes de légumes' })],
      NOW,
    );
    expect(missing).toEqual([{ name: 'Fromage, jambon ou lardons', quantity: '60 g' }]);
  });

  it('adapte les quantités au nombre de personnes', () => {
    const crepes = RECIPES.find((r) => r.id === 'crepes');
    if (!crepes) throw new Error('crepes');
    const forTwo = missingIngredients(crepes, [], [], NOW, 2);
    expect(forTwo.find((m) => m.name === 'Lait')?.quantity).toBe('25 cl');
    expect(forTwo.find((m) => m.name.startsWith('Œuf'))).toEqual({ name: 'Œufs', quantity: '1 ½' });
  });
});

describe('affichage et partage', () => {
  const items = [
    item({ id: 'a', name: 'Tomates', category: 'fruits_legumes', quantity: '6' }),
    item({ id: 'b', name: 'Lait', category: 'produits_laitiers' }),
    item({ id: 'c', name: 'Abricots', category: 'fruits_legumes' }),
    item({ id: 'd', name: 'Pain', category: 'feculents', checked: true, checkedAt: '2026-10-15T08:00:00.000Z' }),
  ];

  it('regroupe par rayon dans l’ordre des catégories et met le panier à part', () => {
    const { sections, checked } = groupShoppingItems(items);
    expect(sections.map((s) => [s.category, s.data.map((i) => i.name)])).toEqual([
      ['fruits_legumes', ['Abricots', 'Tomates']],
      ['produits_laitiers', ['Lait']],
    ]);
    expect(checked.map((i) => i.name)).toEqual(['Pain']);
  });

  it('partage uniquement ce qui reste à acheter', () => {
    const text = formatShoppingList(items);
    expect(text).toContain('• Tomates (6)');
    expect(text).not.toContain('Pain');
  });
});

describe('sauvegarde de la liste de courses', () => {
  it('fait l’aller-retour et reste compatible avec les sauvegardes v1', () => {
    const list = [item({ id: 'x', name: 'Lait', checked: true, checkedAt: '2026-10-15T08:00:00.000Z' })];
    const parsed = parseBackup(JSON.stringify(buildBackup([], DEFAULT_SETTINGS, NOW, { shoppingItems: list })));
    expect(parsed.shoppingItems).toEqual(list);

    const v1 = parseBackup(JSON.stringify({ format: 'smartfridge-backup', version: 1, products: [] }));
    expect(v1.shoppingItems).toEqual([]);
    expect(v1.recipeHistory).toEqual([]);
  });

  it('sauvegarde aussi les recettes favorites et l’historique', () => {
    const history = [{ id: 'h1', recipeId: 'crepes', cookedAt: '2026-10-14T19:00:00.000Z', savedCount: 2 }];
    const parsed = parseBackup(
      JSON.stringify(buildBackup([], DEFAULT_SETTINGS, NOW, { recipeFavorites: ['crepes', 'crepes'], recipeHistory: history })),
    );
    expect(parsed.recipeFavorites).toEqual(['crepes']);
    expect(parsed.recipeHistory).toEqual(history);
  });
});

describe('photos personnelles', () => {
  it('ne sont pas exportées dans la sauvegarde (elles restent sur le téléphone)', () => {
    const products = [
      {
        id: 'a',
        name: 'Tomates',
        category: 'fruits_legumes',
        quantity: '1',
        expiresAt: '2026-10-20',
        location: 'frigo',
        source: 'manual',
        status: 'active',
        addedAt: '2026-10-01T08:00:00.000Z',
        updatedAt: '2026-10-01T08:00:00.000Z',
        imageUri: 'local:photos/abc.jpg',
      },
      {
        id: 'b',
        name: 'Lait',
        category: 'produits_laitiers',
        quantity: '1',
        expiresAt: '2026-10-20',
        location: 'frigo',
        source: 'open_food_facts',
        status: 'active',
        addedAt: '2026-10-01T08:00:00.000Z',
        updatedAt: '2026-10-01T08:00:00.000Z',
        imageUri: 'https://images.openfoodfacts.org/lait.jpg',
      },
    ] as const;
    const file = buildBackup([...products], DEFAULT_SETTINGS, NOW);
    expect(file.products.map((p) => p.imageUri)).toEqual([undefined, 'https://images.openfoodfacts.org/lait.jpg']);
  });
});
