import type { Product } from '@/types/product';
import { formatCents, parsePriceInput } from '@/utils/price';
import { describePurchaseHistory, findSimilarActive, pastPurchases, learnedShelfLifeDays, purchaseHistory, searchProducts, selectInventory, summarizeUrgency } from '@/utils/products';
import { computeWasteStats, filterClosedByPeriod, formatPercent, monthlyBreakdown, selectHistory, wasteByCategory } from '@/utils/stats';

const base: Omit<Product, 'id' | 'name' | 'expiresAt'> = {
  category: 'autre',
  quantity: '1',
  location: 'frigo',
  source: 'manual',
  status: 'active',
  addedAt: '2026-10-01T10:00:00.000Z',
  updatedAt: '2026-10-01T10:00:00.000Z',
};

const make = (overrides: Partial<Product> & Pick<Product, 'id' | 'name' | 'expiresAt'>): Product => ({ ...base, ...overrides });

describe('inventaire', () => {
  const products = [
    make({ id: '1', name: 'Crème fraîche', expiresAt: '2026-10-20' }),
    make({ id: '2', name: 'Yaourt', expiresAt: '2026-10-15', location: 'frigo' }),
    make({ id: '3', name: 'Petits pois', expiresAt: '2026-12-01', location: 'congelateur' }),
    make({ id: '4', name: 'Œufs', expiresAt: '2026-10-13' }),
  ];

  it('recherche sans tenir compte des accents ni de la casse', () => {
    expect(searchProducts(products, 'CREME').map((p) => p.id)).toEqual(['1']);
    expect(searchProducts(products, 'oeufs').map((p) => p.id)).toEqual(['4']);
  });

  it('filtre par emplacement et trie par date croissante', () => {
    expect(selectInventory(products, 'all', '').map((p) => p.id)).toEqual(['4', '2', '1', '3']);
    expect(selectInventory(products, 'congelateur', '').map((p) => p.id)).toEqual(['3']);
  });

  it('compte les produits urgents et périmés', () => {
    expect(summarizeUrgency(products, new Date(2026, 9, 14, 12))).toEqual({ soonCount: 1, expiredCount: 1 });
  });
});

describe('statistiques', () => {
  it('calcule consommés, jetés, taux et montants même sans prix', () => {
    const products = [
      make({ id: '1', name: 'A', expiresAt: '2026-10-01', status: 'consumed', price: 1.1, closedAt: '2026-10-02T08:00:00Z' }),
      make({ id: '2', name: 'B', expiresAt: '2026-10-01', status: 'consumed', price: 2.2, closedAt: '2026-10-03T08:00:00Z' }),
      make({ id: '3', name: 'C', expiresAt: '2026-10-01', status: 'discarded', closedAt: '2026-10-04T08:00:00Z' }),
      make({ id: '4', name: 'D', expiresAt: '2026-10-01', status: 'discarded', price: 0.7, closedAt: '2026-10-01T08:00:00Z' }),
      make({ id: '5', name: 'E', expiresAt: '2026-10-30', price: 9 }),
    ];
    const stats = computeWasteStats(products);
    expect(stats).toMatchObject({ consumedCount: 2, discardedCount: 2, closedCount: 4, savedCents: 330, lostCents: 70, unpricedCount: 1 });
    expect(formatPercent(stats.wasteRate)).toBe('50 %');
    expect(selectHistory(products).map((p) => p.id)).toEqual(['3', '2', '1', '4']);
  });

  it('retourne un taux nul sans historique', () => {
    expect(computeWasteStats([]).wasteRate).toBeNull();
    expect(formatPercent(null)).toBe('—');
  });
});

describe('statistiques détaillées', () => {
  const now = new Date(2026, 9, 14, 12);
  const closed = (id: string, status: 'consumed' | 'discarded', closedAt: Date, extra: Partial<Product> = {}) =>
    make({ id, name: id, expiresAt: '2026-10-01', status, closedAt: closedAt.toISOString(), ...extra });
  const products = [
    closed('a', 'consumed', new Date(2026, 9, 2)),
    closed('b', 'discarded', new Date(2026, 9, 10), { category: 'produits_laitiers', price: 1.5 }),
    closed('c', 'discarded', new Date(2026, 7, 20), { category: 'produits_laitiers', price: 2 }),
    closed('d', 'discarded', new Date(2026, 7, 21), { category: 'fruits_legumes' }),
    closed('e', 'consumed', new Date(2025, 11, 1)),
    make({ id: 'f', name: 'actif', expiresAt: '2026-10-30' }),
  ];

  it('filtre par période', () => {
    expect(filterClosedByPeriod(products, '30d', now).map((p) => p.id)).toEqual(['a', 'b']);
    expect(filterClosedByPeriod(products, '6m', now).map((p) => p.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(filterClosedByPeriod(products, 'all', now)).toHaveLength(5);
  });

  it('répartit par mois sur 6 mois glissants', () => {
    const months = monthlyBreakdown(products, 6, now);
    expect(months.map((m) => m.key)).toEqual(['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10']);
    expect(months.at(-1)).toMatchObject({ consumed: 1, discarded: 1 });
    expect(months[3]).toMatchObject({ consumed: 0, discarded: 2 });
  });

  it('classe les catégories les plus gaspillées', () => {
    expect(wasteByCategory(products)).toEqual([
      { category: 'produits_laitiers', count: 2, lostCents: 350 },
      { category: 'fruits_legumes', count: 1, lostCents: 0 },
    ]);
  });
});

describe('prix', () => {
  it('interprète les saisies françaises', () => {
    expect(parsePriceInput('2,50')).toBe(2.5);
    expect(parsePriceInput(' 3 € ')).toBe(3);
    expect(parsePriceInput('')).toBeUndefined();
    expect(parsePriceInput('abc')).toBeNull();
    expect(parsePriceInput('-2')).toBeNull();
    expect(parsePriceInput('1,234')).toBeNull();
  });

  it('formate en euros', () => {
    expect(formatCents(330).replace(/\s/g, ' ')).toBe('3,30 €');
  });
});

describe('doublons à l’ajout', () => {
  const base = { category: 'autre', quantity: '1', expiresAt: '2026-10-25', location: 'frigo', source: 'manual', addedAt: '2026-10-01T08:00:00.000Z', updatedAt: '2026-10-01T08:00:00.000Z' } as const;
  const stock = [
    { ...base, id: 'a', name: 'Yaourts nature bio', status: 'active' as const },
    { ...base, id: 'b', name: 'Lait demi-écrémé', status: 'consumed' as const },
  ];

  it('retrouve le même aliment principal parmi les produits actifs seulement', () => {
    expect(findSimilarActive(stock, 'yaourts')?.id).toBe('a');
    expect(findSimilarActive(stock, 'Yaourt')?.id).toBe('a');
    expect(findSimilarActive(stock, 'Lait')).toBeUndefined();
    expect(findSimilarActive(stock, 'Yo')).toBeUndefined();
    expect(findSimilarActive(stock, 'Yaourts nature bio', 'a')).toBeUndefined();
  });
});

describe('durée de conservation apprise', () => {
  const past = (name: string, added: string, expires: string, location: 'frigo' | 'placard' = 'frigo', openedAt?: string) => ({
    id: `${name}-${added}`, name, category: 'produits_laitiers' as const, quantity: '1', expiresAt: expires, location,
    source: 'manual' as const, status: 'consumed' as const, addedAt: `${added}T10:00:00`, updatedAt: `${added}T10:00:00`, openedAt,
  });

  it('prend la médiane des achats précédents du même produit au même endroit', () => {
    const history = [
      past('Yaourts nature', '2026-09-01', '2026-09-15'),
      past('yaourts nature', '2026-09-20', '2026-10-08'),
      past('Yaourts nature', '2026-10-01', '2026-10-17'),
      past('Yaourts nature', '2026-10-02', '2027-01-01', 'placard'),
      past('Yaourts nature', '2026-10-03', '2026-10-05', 'frigo', '2026-10-03'),
    ];
    expect(learnedShelfLifeDays(history, 'Yaourts Nature', 'frigo')).toEqual({ days: 16, count: 3 });
    expect(learnedShelfLifeDays(history, 'Beurre', 'frigo')).toBeNull();
  });
});

describe('historique d’achat dans le formulaire', () => {
  const item = (status: 'active' | 'consumed' | 'discarded', price?: number, day = '10') => ({
    id: `${status}-${day}-${price}`, name: 'Salade', category: 'fruits_legumes' as const, quantity: '1', expiresAt: '2026-10-25',
    location: 'frigo' as const, source: 'manual' as const, status, price, addedAt: `2026-10-${day}T10:00:00`, updatedAt: `2026-10-${day}T10:00:00`,
  });

  it('résume les achats et signale un gaspillage récurrent', () => {
    const h = purchaseHistory([item('discarded', 1.5, '01'), item('discarded', 1.7, '05'), item('consumed', undefined, '08'), item('active', 1.6, '12')], 'salade');
    expect(h).toMatchObject({ count: 4, averagePrice: 1.6, discarded: 2, consumed: 1, lastAddedAt: '2026-10-12T10:00:00' });
    expect(describePurchaseHistory(h!)).toEqual({
      text: 'Déjà acheté 4 fois, 1,60 € en moyenne. Vous en avez jeté 2 sur 3 : une plus petite quantité suffirait peut-être.',
      warn: true,
    });
    expect(describePurchaseHistory(purchaseHistory([item('consumed', undefined, '01')], 'Salade')!)).toEqual({ text: 'Déjà acheté une fois.', warn: false });
    expect(describePurchaseHistory(purchaseHistory([item('consumed', 2, '01'), item('consumed', undefined, '02')], 'Salade')!).text).toBe(
      'Déjà acheté 2 fois, payé 2,00 €.',
    );
    expect(purchaseHistory([item('consumed')], 'Tomate')).toBeNull();
  });
});

describe('achats précédents sur la fiche produit', () => {
  const current = make({ id: 'now', name: 'Yaourt nature', expiresAt: '2026-11-20', addedAt: '2026-11-01T08:00:00.000Z' });
  const past = (id: string, addedAt: string, closedAt: string, status: Product['status'], price?: number, name = 'Yaourt nature') =>
    make({ id, name, expiresAt: '2026-10-30', addedAt, closedAt, status, price });

  it('ne compte ni le produit affiché, ni un autre produit encore au frigo, ni un produit différent', () => {
    const list = [
      current,
      make({ id: 'other', name: 'Yaourt nature', expiresAt: '2026-11-25' }),
      past('pain', '2026-10-01T08:00:00.000Z', '2026-10-03T08:00:00.000Z', 'consumed', 1, 'Pain de mie'),
    ];
    expect(pastPurchases(list, current)).toBeNull();
  });

  it('résume prix moyen, durée réelle médiane et produits jetés, du plus récent au plus ancien', () => {
    const list = [
      current,
      past('a', '2026-09-01T08:00:00.000Z', '2026-09-05T08:00:00.000Z', 'consumed', 2),
      past('b', '2026-09-20T08:00:00.000Z', '2026-09-30T08:00:00.000Z', 'consumed', 3),
      past('c', '2026-10-05T08:00:00.000Z', '2026-10-11T08:00:00.000Z', 'discarded'),
      past('d', '2026-10-15T08:00:00.000Z', '2026-10-20T08:00:00.000Z', 'consumed', 2.5, 'Yaourts nature'),
    ];
    const recap = pastPurchases(list, current);
    expect(recap).toMatchObject({ count: 4, averagePrice: 2.5, keptDays: 6, consumed: 3, discarded: 1 });
    expect(recap?.recent.map((p) => p.id)).toEqual(['d', 'c', 'b']);
    expect(recap?.recent[1]).toMatchObject({ status: 'discarded', keptDays: 6 });
  });
});
