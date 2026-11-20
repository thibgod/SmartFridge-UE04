import { computeAchievements, wasteFreeStreak } from '@/features/achievements/achievements';
import { planPartial } from '@/features/products/smartActions';
import type { Product } from '@/types/product';
import { computeImpact, estimateWeightKg, formatKg, parseWeightKg } from '@/utils/impact';
import { computeWasteStats } from '@/utils/stats';

const product = (overrides: Partial<Product>): Product => ({
  id: Math.random().toString(36),
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

const NOW = new Date(2026, 9, 19, 12);
const on = (day: string) => new Date(`${day}T12:00:00`).toISOString();

describe('poids et impact estimés', () => {
  it('lit le poids dans la quantité saisie', () => {
    expect(parseWeightKg('500 g')).toBe(0.5);
    expect(parseWeightKg('1,5 kg')).toBe(1.5);
    expect(parseWeightKg('4 x 125g')).toBe(0.5);
    expect(parseWeightKg('75cl')).toBe(0.75);
    expect(parseWeightKg('6')).toBeNull();
    expect(parseWeightKg('500 kg')).toBeNull();
  });

  it('se rabat sur une moyenne prudente par catégorie', () => {
    expect(estimateWeightKg({ quantity: '1', category: 'viande_poisson' })).toBe(0.35);
    expect(estimateWeightKg({ quantity: '6', category: 'fruits_legumes' })).toBe(1);
  });

  it('ne compte que les produits consommés et convertit en km de voiture', () => {
    const impact = computeImpact([
      product({ status: 'consumed', category: 'viande_poisson', quantity: '500 g' }),
      product({ status: 'discarded', category: 'viande_poisson', quantity: '500 g' }),
      product({ status: 'active', category: 'viande_poisson', quantity: '1 kg' }),
    ]);
    expect(impact.savedKg).toBe(0.5);
    expect(impact.co2Kg).toBe(6);
    expect(impact.carKm).toBe(30);
    expect(formatKg(0.5)).toBe('500 g');
    expect(formatKg(3.24)).toBe('3,2 kg');
  });
});

describe('série et badges', () => {
  it('compte les jours depuis le dernier produit jeté', () => {
    expect(wasteFreeStreak([], NOW)).toBeNull();
    expect(
      wasteFreeStreak(
        [product({ status: 'discarded', closedAt: on('2026-10-10') }), product({ status: 'consumed', closedAt: on('2026-10-15') })],
        NOW,
      ),
    ).toBe(9);
    expect(wasteFreeStreak([product({ status: 'consumed', closedAt: on('2026-10-17') })], NOW)).toBe(3);
  });

  it('débloque les badges et propose le plus proche', () => {
    const products = Array.from({ length: 8 }, (_, i) =>
      product({ status: 'consumed', price: 2.5, closedAt: on(`2026-10-${String(10 + i).padStart(2, '0')}`) }),
    );
    const { badges, next, streakDays } = computeAchievements(products, [{ id: 'h', recipeId: 'crepes', cookedAt: on('2026-10-12'), savedCount: 2 }], NOW);
    const achieved = badges.filter((b) => b.achieved).map((b) => b.id);
    expect(achieved).toEqual(['first-save', 'week', 'chef']);
    expect(streakDays).toBe(10);
    expect(next?.id).toBe('save-10');
    expect(badges.find((b) => b.id === 'euros-50')).toMatchObject({ current: 20, target: 50 });
  });
});

describe('utilisation partielle', () => {
  it('ne compte comme perdu que ce qui restait du produit jeté', () => {
    const stats = computeWasteStats([product({ status: 'discarded', price: 4, remaining: 0.25 }), product({ status: 'consumed', price: 2 })]);
    expect(stats).toMatchObject({ lostCents: 100, savedCents: 500, discardedCount: 1, consumedCount: 1 });
    const impact = computeImpact([product({ status: 'discarded', category: 'produits_laitiers', quantity: '1 kg', remaining: 0.5 })]);
    expect(impact.savedKg).toBe(0.5);
  });

  it('raccourcit la date au frigo comme un produit entamé', () => {
    const plan = planPartial(product({ category: 'produits_laitiers', expiresAt: '2026-11-10' }), 0.5, '2026-10-19');
    expect(plan.input).toMatchObject({ remaining: 0.5, openedAt: '2026-10-19', expiresAt: '2026-10-22' });
    const again = planPartial(product({ category: 'produits_laitiers', expiresAt: '2026-10-22', openedAt: '2026-10-19', remaining: 0.5 }), 0.25, '2026-10-20');
    expect(again.input).toMatchObject({ remaining: 0.25, expiresAt: '2026-10-22' });
  });
});
