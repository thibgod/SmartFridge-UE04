import { savingsText } from '@/features/stats/savings';
import { buildReportHtml } from '@/features/stats/reportHtml';
import type { Product } from '@/types/product';
import { AVERAGE_WASTE_SHARE, avoidedVsAverage, compareToAverage, computeWasteStats, isRescued } from '@/utils/stats';

const product = (overrides: Partial<Product>): Product => ({
  id: Math.random().toString(36),
  name: 'Produit',
  category: 'autre',
  quantity: '1',
  expiresAt: '2026-10-20',
  location: 'frigo',
  source: 'manual',
  status: 'consumed',
  addedAt: '2026-10-01T08:00:00.000Z',
  updatedAt: '2026-10-01T08:00:00.000Z',
  ...overrides,
});
const on = (day: string) => new Date(`${day}T12:00:00`).toISOString();
// Texte normalisé : espaces insécables de Intl remplacées par des espaces simples.
const plain = (text: string) => text.replace(/[  ]/g, ' ');

describe('sauvé de justesse', () => {
  it('compte les produits mangés près de leur date ou après', () => {
    expect(isRescued(product({ closedAt: on('2026-10-17') }), 3)).toBe(true);
    expect(isRescued(product({ closedAt: on('2026-10-22') }), 3)).toBe(true);
    expect(isRescued(product({ closedAt: on('2026-10-16') }), 3)).toBe(false);
    // Le seuil suit le réglage « urgent » de l’utilisateur.
    expect(isRescued(product({ closedAt: on('2026-10-16') }), 5)).toBe(true);
  });

  it('ignore les produits jetés ou encore au frigo', () => {
    expect(isRescued(product({ status: 'discarded', closedAt: on('2026-10-19') }))).toBe(false);
    expect(isRescued(product({ status: 'active' }))).toBe(false);
  });
});

describe('économies par rapport à un foyer moyen', () => {
  it('estime ce qu’un foyer moyen aurait jeté sur les mêmes courses', () => {
    expect(AVERAGE_WASTE_SHARE).toBe(0.15);
    expect(avoidedVsAverage(10_000, 600)).toBe(900);
    // Plus jeté que la moyenne : aucune économie, jamais un montant négatif.
    expect(avoidedVsAverage(10_000, 2_500)).toBe(0);
  });

  it('calcule la part jetée en valeur et les produits sauvés', () => {
    const stats = computeWasteStats([
      product({ price: 60, closedAt: on('2026-10-02') }),
      product({ price: 34, closedAt: on('2026-10-19') }),
      product({ status: 'discarded', price: 6, closedAt: on('2026-10-21') }),
      product({ status: 'consumed', closedAt: on('2026-10-19') }),
    ]);
    expect(stats).toMatchObject({
      eatenCents: 9_400,
      lostCents: 600,
      trackedCents: 10_000,
      wasteShare: 0.06,
      avoidedCents: 900,
      rescuedCount: 2,
      rescuedCents: 3_400,
      unpricedCount: 1,
    });
    expect(compareToAverage(stats)).toEqual({ share: 0.06, averageShare: 0.15, avoidedCents: 900, verdict: 'better' });
  });

  it('se dit « dans la moyenne » à moins de 2 points d’écart', () => {
    const stats = computeWasteStats([product({ price: 86 }), product({ status: 'discarded', price: 14 })]);
    expect(compareToAverage(stats)?.verdict).toBe('similar');
    const worse = computeWasteStats([product({ price: 70 }), product({ status: 'discarded', price: 30 })]);
    expect(compareToAverage(worse)).toMatchObject({ verdict: 'worse', avoidedCents: 0 });
  });

  it('ne compare rien sans produit au prix connu', () => {
    expect(compareToAverage(computeWasteStats([product({})]))).toBeNull();
    expect(computeWasteStats([]).wasteShare).toBeNull();
  });

  it('rédige les phrases en vouvoyant', () => {
    const stats = computeWasteStats([
      product({ price: 60, closedAt: on('2026-10-02') }),
      product({ price: 34, closedAt: on('2026-10-19') }),
      product({ status: 'discarded', price: 6 }),
    ]);
    const comparison = compareToAverage(stats);
    if (!comparison) throw new Error('comparaison attendue');
    const text = savingsText(comparison, stats, 3);
    expect(plain(text.headline)).toBe(
      'Vous jetez 6 % de vos courses, contre environ 15 % dans un foyer moyen : environ 9,00 € de moins à la poubelle.',
    );
    expect(plain(text.rescued ?? '')).toBe('Dont 34,00 € sauvés de justesse : 1 produit mangé à 3 jours ou moins de leur date.');
  });

  it('affiche la même économie dans le rapport PDF', () => {
    const html = plain(
      buildReportHtml([product({ price: 94 }), product({ status: 'discarded', price: 6 })], new Date(2026, 9, 25)),
    );
    expect(html).toContain('≈ 9,00 €');
    expect(html).toContain('6&nbsp;% jetés (moyenne ≈&nbsp;15&nbsp;%)');
  });
});
