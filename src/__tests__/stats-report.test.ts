import { buildReportHtml } from '@/features/stats/reportHtml';
import type { Product } from '@/types/product';

const product = (overrides: Partial<Product>): Product => ({
  id: Math.random().toString(36),
  name: 'Produit',
  category: 'fruits_legumes',
  quantity: '1',
  expiresAt: '2026-10-20',
  location: 'frigo',
  source: 'manual',
  status: 'consumed',
  addedAt: '2026-10-01T08:00:00.000Z',
  updatedAt: '2026-10-01T08:00:00.000Z',
  closedAt: '2026-10-18T19:30:00.000Z',
  price: 2,
  ...overrides,
});

describe('rapport PDF du Bilan', () => {
  const now = new Date(2026, 9, 22, 9, 41);
  const html = buildReportHtml(
    [
      product({ name: 'Pommes' }),
      product({ name: 'Salade', status: 'discarded', price: 1.3 }),
      product({ name: '<script>alert(1)</script>', status: 'consumed' }),
      product({ name: 'Encore au frigo', status: 'active', closedAt: undefined }),
    ],
    now,
  );

  it('résume le bilan : montants, score et période', () => {
    expect(html).toContain('<html lang="fr">');
    expect(html).toContain('Bilan SmartFridge');
    expect(html).toMatch(/4,00\s€/); // économisés (2 consommés à 2 €)
    expect(html).toMatch(/1,30\s€/); // perdus
    expect(html).toContain('67'); // score : 2 consommés sur 3
    expect(html).toContain('22 octobre 2026');
  });

  it('garde les couleurs des barres à l’impression', () => {
    expect(html).toContain('print-color-adjust: exact');
  });

  it('liste l’historique sans les produits encore au frigo, noms échappés', () => {
    expect(html).toContain('Pommes');
    expect(html).not.toContain('Encore au frigo');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
