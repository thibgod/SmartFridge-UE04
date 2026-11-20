import { RECIPES } from '@/data/recipes';
import { ingredientInStock, productRelevance } from '@/features/recipes/recipeMatching';
import { findCatalogImage, guessCategory, isRelevantPage } from '@/services/images/foodImages';
import type { Product } from '@/types/product';
import { parseFoodName, significantHead } from '@/utils/foodName';

const product = (name: string): Product => ({
  id: name,
  name,
  category: 'autre',
  quantity: '1',
  expiresAt: '2030-01-01',
  location: 'frigo',
  source: 'manual',
  status: 'active',
  addedAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
});

const imageOf = (name: string) => decodeURIComponent(findCatalogImage(name)?.split('FilePath/')[1]?.split('?')[0] ?? '');
const recipesFor = (name: string) => RECIPES.filter((r) => productRelevance(r, product(name)) === 'ingredient').map((r) => r.id);

describe('analyse des noms d’aliments', () => {
  it.each([
    ['Petits pains au beurre', ['pain']],
    ['Yaourt à la fraise', ['yaourt']],
    ['Jus d’orange', ['jus']],
    ['Filet de saumon', ['saumon']],
    ['Blancs de poulet', ['poulet']],
    ['Petit pot de compote', ['compote']],
    ['Pommes de terre', ['pomme_de_terre']],
    ['Pâte à tartiner', ['pate_a_tartiner']],
    ['Sauce tomate', ['sauce']],
    ['Pâté de campagne', ['terrine']],
    ['Lait demi-écrémé', ['lait', 'demi-ecreme']],
  ])('%s → aliment principal %j', (name, head) => {
    expect(significantHead(name)).toEqual(head);
  });

  it('garde tous les mots pour le contexte', () => {
    expect(parseFoodName('Petits pains au beurre').all).toEqual(['petit', 'pain', 'beurre']);
  });
});

describe('illustrations : on montre l’aliment, pas son parfum', () => {
  it.each([
    ['Petits pains au beurre', 'Baguette mie.jpg'],
    ['Beurre doux', 'Block of butter 20200928 080207.jpg'],
    ['Jus d’orange', 'Orange_juice_1.jpg'],
    ['Yaourt à la fraise', 'Joghurt.jpg'],
    ['Filet de saumon', 'Raw salmon fillets.jpg'],
    ['Pommes de terre', 'Patates.jpg'],
    ['Pâté de campagne', 'Wurstplatte.jpg'],
  ])('%s → %s', (name, file) => {
    expect(imageOf(name)).toBe(file);
  });

  it.each(['Confiture de fraises', 'Pâte à tartiner', 'Salade de fruits', 'Sauce tomate', 'Tarte aux pommes', 'Chips saveur fromage'])(
    '%s → pas de photo trompeuse du catalogue',
    (name) => {
      expect(findCatalogImage(name)).toBeNull();
    },
  );

  it('rejette une page Wikipédia qui décrit le parfum plutôt que l’aliment', () => {
    expect(isRelevantPage('Petits pains au beurre', 'Beurre')).toBe(false);
    expect(isRelevantPage('Petits pains au beurre', 'Petit pain')).toBe(true);
    expect(isRelevantPage('Confiture de fraises', 'Fraise')).toBe(false);
    expect(isRelevantPage('Confiture de fraises', 'Confiture')).toBe(true);
  });
});

describe('catégorie devinée d’après le nom', () => {
  it.each([
    ['Petits pains au beurre', 'feculents'],
    ['Beurre doux', 'produits_laitiers'],
    ['Yaourt à la fraise', 'produits_laitiers'],
    ['Confiture de fraises', 'autre'],
    ['Escalope de dinde', 'viande_poisson'],
    ['Pâtes fraîches', 'feculents'],
    ['Salade de pâtes', 'plats_prepares'],
    ['Courgettes bio', 'fruits_legumes'],
  ] as const)('%s → %s', (name, category) => {
    expect(guessCategory(name)).toBe(category);
  });

  it('ne devine rien pour un nom inconnu', () => {
    expect(guessCategory('Produit mystère')).toBeNull();
  });
});

describe('recettes et ingrédients', () => {
  it('ne cuisine pas les petits pains comme du beurre', () => {
    const forRolls = recipesFor('Petits pains au beurre');
    expect(forRolls).toContain('pain-perdu');
    // Recettes qui n’ont que du beurre en commun : jamais proposées.
    expect(forRolls).not.toContain('crepes');
    expect(forRolls).not.toContain('banana-bread');
    expect(ingredientInStock({ name: 'beurre' }, [product('Petits pains au beurre')])).toBe(false);
    expect(ingredientInStock({ name: 'pain rassis', match: ['pain', 'brioche'] }, [product('Petits pains au beurre')])).toBe(true);
  });

  it('ne confond pas les préparations avec leurs ingrédients', () => {
    expect(recipesFor('Pâte à tartiner')).toEqual([]);
    expect(recipesFor('Tarte aux pommes')).toEqual([]);
    expect(recipesFor('Riz au lait')).toEqual([]);
    expect(recipesFor('Confiture de fraises')).toEqual([]);
    expect(recipesFor('Sauce tomate')).toEqual([]);
  });

  it('reconnaît toujours les vrais ingrédients', () => {
    expect(recipesFor('Yaourt à la fraise')).toContain('smoothie');
    expect(recipesFor('Filet de saumon')).toContain('quiche');
    expect(ingredientInStock({ name: 'riz cuit', match: ['riz'] }, [product('Riz basmati')])).toBe(true);
    expect(ingredientInStock({ name: 'pâte brisée', match: ['pate brisee'] }, [product('Pâtes fraîches')])).toBe(false);
  });
});
