import { mapOffCategories } from '@/services/openFoodFacts/categoryMapping';
import { fetchProductByBarcode, isPlausibleBarcode, parseOffPayload } from '@/services/openFoodFacts/client';

describe('mapping des catégories Open Food Facts', () => {
  it.each([
    [['en:dairies', 'en:fermented-foods', 'en:yogurts'], 'produits_laitiers'],
    [['en:meats', 'en:prepared-meats', 'en:hams'], 'viande_poisson'],
    [['en:plant-based-foods', 'en:fruits', 'en:apples'], 'fruits_legumes'],
    [['en:plant-based-foods', 'en:cereals-and-potatoes', 'en:pastas'], 'feculents'],
    [['en:meals', 'en:pizzas'], 'plats_prepares'],
    [['en:condiments', 'en:sauces', 'en:tomato-sauces'], 'autre'],
    [['en:beverages', 'en:fruit-juices'], 'autre'],
    [[], 'autre'],
    [undefined, 'autre'],
  ])('%j → %s', (tags, expected) => {
    expect(mapOffCategories(tags)).toBe(expected);
  });
});

describe('lecture de la réponse API', () => {
  it('privilégie le nom français et nettoie les données', () => {
    const data = parseOffPayload('3017620422003', {
      status: 1,
      product: {
        product_name: 'Hazelnut spread',
        product_name_fr: '  Pâte à tartiner  ',
        brands: 'Marque A, Marque B',
        image_front_small_url: 'https://images.openfoodfacts.org/x.jpg',
        categories_tags: ['en:spreads'],
        quantity: '400 g',
      },
    });
    expect(data).toEqual({
      barcode: '3017620422003',
      name: 'Pâte à tartiner',
      brand: 'Marque A',
      imageUrl: 'https://images.openfoodfacts.org/x.jpg',
      category: 'autre',
      quantity: '400 g',
    });
  });

  it('retire le symbole de quantité estimée (℮)', () => {
    const parse = (quantity: string) =>
      parseOffPayload('12345678', { status: 1, product: { product_name: 'X', quantity } })?.quantity;
    expect(parse('400 g e')).toBe('400 g');
    expect(parse('1 L ℮')).toBe('1 L');
    expect(parse('6 x 125 g')).toBe('6 x 125 g');
  });

  it('tolère les champs absents ou mal typés', () => {
    expect(
      parseOffPayload('12345678', { status: 1, product: { product_name: 42, image_front_small_url: 'http://insecure' } }),
    ).toBeNull();
    expect(parseOffPayload('12345678', { status: 0 })).toBeNull();
    expect(parseOffPayload('12345678', 'oops')).toBeNull();
  });
});

describe('fetchProductByBarcode', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('refuse un code invalide sans appel réseau', async () => {
    globalThis.fetch = jest.fn();
    expect(isPlausibleBarcode('123')).toBe(false);
    await expect(fetchProductByBarcode('123')).resolves.toEqual({ status: 'error', reason: 'invalid_barcode' });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('signale un produit introuvable (404)', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({ status: 404, ok: false });
    await expect(fetchProductByBarcode('3017620422003')).resolves.toEqual({ status: 'not_found' });
  });

  it('gère une erreur réseau', async () => {
    globalThis.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    await expect(fetchProductByBarcode('3017620422003')).resolves.toEqual({ status: 'error', reason: 'network' });
  });

  it('retourne le produit trouvé', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({ status: 1, product: { product_name: 'Lait demi-écrémé', categories_tags: ['en:milks'] } }),
    });
    const result = await fetchProductByBarcode('3017620422003');
    expect(result).toMatchObject({ status: 'found', product: { name: 'Lait demi-écrémé', category: 'produits_laitiers' } });
  });
});
