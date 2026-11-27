import type { Product } from '@/types/product';
import { formatDayMonth } from '@/utils/date';
import { bundleLots, groupLots, groupSections, sortByExpiry } from '@/utils/products';

const NOW = new Date(2026, 10, 26, 12);
let nextId = 0;
const lot = (name: string, expiresAt: string, overrides: Partial<Product> = {}): Product => {
  nextId += 1;
  return {
    id: String(nextId),
    name,
    category: 'produits_laitiers',
    quantity: '1 l',
    expiresAt,
    location: 'frigo',
    source: 'manual',
    status: 'active',
    addedAt: '2026-11-21T09:00:00.000Z',
    updatedAt: '2026-11-21T09:00:00.000Z',
    ...overrides,
  };
};

describe('produits regroupés', () => {
  const stock = sortByExpiry([
    lot('Lait', '2026-11-29'),
    lot('Beurre', '2026-12-30'),
    lot('lait ', '2026-12-02'),
    lot('Lait', '2026-11-25'),
    lot('Lait', '2027-01-10', { location: 'congelateur' }),
  ]);

  it('réunit les lots du même produit au même endroit, le plus pressé en premier', () => {
    const groups = groupLots(stock);
    expect(groups.map((g) => [g.key, g.lots.map((l) => l.expiresAt)])).toEqual([
      ['frigo:lait', ['2026-11-25', '2026-11-29', '2026-12-02']],
      ['frigo:beurre', ['2026-12-30']],
      ['congelateur:lait', ['2027-01-10']],
    ]);
  });

  it('range un groupe dans la section de son lot le plus pressé', () => {
    const sections = groupSections(stock, NOW, 3);
    expect(sections.map((s) => [s.level, s.groups.map((g) => g.key)])).toEqual([
      ['expired', ['frigo:lait']],
      ['ok', ['frigo:beurre', 'congelateur:lait']],
    ]);
  });

  it('réunit les lots identiques pour l’affichage', () => {
    const lots = [
      lot('Beurre', '2026-12-30'),
      lot('Beurre', '2026-12-30'),
      lot('Beurre', '2026-12-30', { remaining: 0.5 }),
      lot('Beurre', '2026-12-30', { addedAt: '2026-11-14T09:00:00.000Z' }),
    ];
    expect(bundleLots(lots).map((bundle) => bundle.length)).toEqual([2, 1, 1]);
  });

  it('écrit une date proche sans l’année', () => {
    expect(formatDayMonth('2026-11-21').replace(/ /g, ' ')).toBe('21 nov.');
  });
});
