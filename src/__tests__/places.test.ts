import {
  canAddPlace,
  countByPlace,
  MAIN_PLACE,
  normalizePlaceName,
  placeOf,
  productsInPlace,
  validatePlaceName,
} from '@/features/places/places';
import { buildBackup, parseBackup } from '@/services/backup/format';
import type { Product } from '@/types/product';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { findSimilarActive } from '@/utils/products';

const product = (overrides: Partial<Product>): Product => ({
  id: Math.random().toString(36),
  name: 'Produit',
  category: 'autre',
  quantity: '1',
  expiresAt: '2026-10-30',
  location: 'frigo',
  source: 'manual',
  status: 'active',
  addedAt: '2026-10-01T08:00:00.000Z',
  updatedAt: '2026-10-01T08:00:00.000Z',
  ...overrides,
});

const places = [
  { id: 'bureau', name: 'Bureau', icon: 'briefcase-outline' as const, createdAt: '2026-10-20T08:00:00.000Z' },
  { id: 'chalet', name: 'Chalet', icon: 'home-outline' as const, createdAt: '2026-10-21T08:00:00.000Z' },
];

describe('plusieurs frigos et lieux', () => {
  it('range un produit sans lieu (données existantes) dans « Maison »', () => {
    expect(placeOf(product({}))).toBe(MAIN_PLACE.id);
    expect(placeOf(product({ placeId: 'bureau' }))).toBe('bureau');
    // Lieu supprimé entre-temps : le produit revient à la maison plutôt que de disparaître.
    expect(placeOf(product({ placeId: 'disparu' }), places)).toBe(MAIN_PLACE.id);
  });

  it('filtre l’inventaire et compte les produits actifs par lieu', () => {
    const items = [product({}), product({ placeId: 'bureau' }), product({ placeId: 'bureau' }), product({ status: 'consumed' })];
    expect(productsInPlace(items, MAIN_PLACE.id, places)).toHaveLength(1); // le produit consommé n’est plus au frigo
    expect(productsInPlace(items, 'bureau', places)).toHaveLength(2);
    expect(countByPlace(items, places)).toEqual({ maison: 1, bureau: 2, chalet: 0 });
  });

  it('valide le nom d’un lieu : non vide, court et unique', () => {
    expect(normalizePlaceName('  Frigo   du  bureau ')).toBe('Frigo du bureau');
    expect(validatePlaceName('', places)).toBe('Donnez un nom à ce lieu.');
    expect(validatePlaceName('bureau', places)).toBe('Ce nom est déjà utilisé.');
    expect(validatePlaceName('maison', places)).toBe('Ce nom est déjà utilisé.');
    expect(validatePlaceName('Bureau', places, 'bureau')).toBeNull();
    expect(validatePlaceName('Cave', places)).toBeNull();
    expect(validatePlaceName('x'.repeat(31), places)).toBe('30 caractères au maximum.');
  });

  it('réserve la création de lieux à Premium, jamais leur consultation', () => {
    expect(canAddPlace(false, 0)).toBe(false);
    expect(canAddPlace(true, 2)).toBe(true);
    expect(canAddPlace(true, 9)).toBe(false);
  });
});

describe('lieux et sauvegardes', () => {
  it('emporte les lieux et le lieu de chaque produit, et ignore un lieu illisible', () => {
    const file = buildBackup([product({ id: 'a', placeId: 'bureau' }), product({ id: 'b' })], DEFAULT_SETTINGS, new Date(), {
      places,
    });
    const tampered = JSON.parse(JSON.stringify(file));
    tampered.places.push({ id: '', name: 'Sans id' }, { id: 'x', name: '   ' });
    const parsed = parseBackup(JSON.stringify(tampered));
    expect(parsed.places.map((p) => p.id)).toEqual(['bureau', 'chalet']);
    expect(parsed.products.find((p) => p.id === 'a')?.placeId).toBe('bureau');
    expect(parsed.products.find((p) => p.id === 'b')?.placeId).toBeUndefined();
  });

  it('lit une ancienne sauvegarde, sans lieux', () => {
    const file = buildBackup([product({ id: 'a' })], DEFAULT_SETTINGS);
    const old = { ...JSON.parse(JSON.stringify(file)), version: 3 };
    delete old.places;
    expect(parseBackup(JSON.stringify(old)).places).toEqual([]);
  });
});

describe('doublons et lieux', () => {
  it('ne signale un doublon que dans le lieu où l’on range le produit', () => {
    const items = [product({ name: 'Yaourts nature' }), product({ name: 'Pain', placeId: 'bureau' })];
    const atOffice = productsInPlace(items, 'bureau', places);
    expect(findSimilarActive(atOffice, 'Yaourt nature')).toBeUndefined();
    expect(findSimilarActive(productsInPlace(items, MAIN_PLACE.id, places), 'Yaourt nature')?.name).toBe('Yaourts nature');
  });
});
