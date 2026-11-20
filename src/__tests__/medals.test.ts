import { computeAchievements } from '@/features/achievements/achievements';
import {
  medalOf,
  newlyEarned,
  polygonPoints,
  seenAfterOpening,
  TIER_LABEL,
  flipAngle,
  isShowingBack,
  restingAngle,
} from '@/features/achievements/medals';
import type { Product } from '@/types/product';

const consumed = (n: number): Product[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Produit ${i}`,
    category: 'autre',
    quantity: '1',
    expiresAt: '2026-11-10',
    location: 'frigo',
    source: 'manual',
    status: 'consumed',
    addedAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-02T08:00:00.000Z',
    closedAt: '2026-11-02T08:00:00.000Z',
    price: 2,
  }));

describe('médailles des badges', () => {
  const { badges } = computeAchievements(consumed(12), [], new Date(2026, 10, 17));

  it('donne à chaque badge un métal qui suit la difficulté, et une forme par famille', () => {
    expect(medalOf(badges.find((b) => b.id === 'first-save')!)).toEqual({ tier: 'bronze', shape: 'cercle' });
    expect(medalOf(badges.find((b) => b.id === 'save-100')!)).toEqual({ tier: 'platine', shape: 'cercle' });
    expect(medalOf(badges.find((b) => b.id === 'week')!).shape).toBe('hexagone');
    expect(medalOf(badges.find((b) => b.id === 'chef')!).shape).toBe('octogone');
    expect(medalOf(badges.find((b) => b.id === 'co2-25')!).shape).toBe('rosace');
    expect(TIER_LABEL.or).toBe('Médaille d’or');
    // Chaque badge connu a sa médaille : aucun ne retombe sur la valeur par défaut.
    expect(badges.every((b) => medalOf(b).tier !== undefined)).toBe(true);
  });

  it('ne fête rien au premier lancement de la fonction, puis seulement les nouveaux badges', () => {
    expect(newlyEarned(badges, null)).toEqual([]);
    const earned = badges.filter((b) => b.achieved).map((b) => b.id);
    expect(earned).toEqual(expect.arrayContaining(['first-save', 'save-10']));
    expect(newlyEarned(badges, ['first-save'])).toEqual(earned.filter((id) => id !== 'first-save'));
    expect(
      newlyEarned(
        badges,
        badges.filter((b) => b.achieved).map((b) => b.id),
      ),
    ).toEqual([]);
  });

  it('retient un badge comme vu une fois sa fiche ouverte, sans doublon', () => {
    expect(seenAfterOpening(['first-save'], 'save-10')).toEqual(['first-save', 'save-10']);
    expect(seenAfterOpening(['first-save'], 'first-save')).toEqual(['first-save']);
  });

  it('dessine des polygones fermés et réguliers', () => {
    const hex = polygonPoints(6, 50, 50, 48).split(' ');
    expect(hex).toHaveLength(6);
    expect(hex[0]).toBe('50,2');
  });
});

describe('rotation de la médaille', () => {
  it('se pose sur la face la plus proche : on peut la laisser sur le revers', () => {
    expect(restingAngle(30, 0)).toBe(0);
    expect(restingAngle(110, 0)).toBe(180);
    expect(restingAngle(200, 50)).toBe(180);
    expect(restingAngle(-120, 0)).toBe(-180);
  });

  it('garde un peu d’élan, sans jamais faire plus d’un tour de plus', () => {
    expect(restingAngle(0, 1500)).toBe(180);
    expect(restingAngle(0, 20000)).toBe(360);
    expect(restingAngle(0, -20000)).toBe(-360);
  });

  it('un toucher la retourne d’un demi-tour, dans le sens de la lecture', () => {
    expect(flipAngle(0)).toBe(180);
    expect(flipAngle(180)).toBe(360);
    expect(flipAngle(170)).toBe(360);
    expect(isShowingBack(180)).toBe(true);
    expect(isShowingBack(-180)).toBe(true);
    expect(isShowingBack(360)).toBe(false);
  });
});
