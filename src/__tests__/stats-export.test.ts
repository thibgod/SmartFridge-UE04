import { buildHistoryCsv, CSV_BOM } from '@/features/stats/exportCsv';
import type { Product } from '@/types/product';

const product = (overrides: Partial<Product>): Product => ({
  id: 'p',
  name: 'Produit',
  category: 'produits_laitiers',
  quantity: '1',
  expiresAt: '2026-10-20',
  location: 'frigo',
  source: 'manual',
  status: 'consumed',
  addedAt: '2026-10-01T08:00:00.000Z',
  updatedAt: '2026-10-01T08:00:00.000Z',
  closedAt: '2026-10-18T19:30:00.000Z',
  ...overrides,
});

describe('export CSV du Bilan', () => {
  it('produit un tableau lisible par Excel en français (BOM, point-virgule, virgule décimale)', () => {
    const csv = buildHistoryCsv([
      product({ name: 'Yaourt nature', price: 1.25 }),
      product({ id: 'b', name: 'Crème « légère »; 20 cl', status: 'discarded', price: 2, remaining: 0.5, location: 'placard' }),
    ]);
    expect(csv.startsWith(CSV_BOM)).toBe(true);
    const lines = csv.slice(CSV_BOM.length).split('\r\n');
    expect(lines[0]).toBe('Produit;Catégorie;Emplacement;Statut;Date;Péremption;Prix (€);Gaspillé (€)');
    // Le plus récent d’abord ; les champs avec « ; » ou guillemets sont protégés.
    expect(lines[1]).toBe('Yaourt nature;Produits laitiers;Frigo;Consommé;18/10/2026;20/10/2026;1,25;0,00');
    expect(lines[2]).toBe('"Crème « légère »; 20 cl";Produits laitiers;Placard;Jeté;18/10/2026;20/10/2026;2,00;1,00');
  });

  it('ignore les produits encore au frigo et laisse vide un prix inconnu', () => {
    const csv = buildHistoryCsv([product({ status: 'active', closedAt: undefined }), product({ name: 'Pain' })]);
    const lines = csv.slice(CSV_BOM.length).split('\r\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]?.endsWith(';;')).toBe(true);
  });

  it('neutralise les formules qu’un tableur exécuterait', () => {
    const csv = buildHistoryCsv([product({ name: '=HYPERLINK("x")' })]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });
});
