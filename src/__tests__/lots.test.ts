import { allowedLots, lotInputs, MAX_LOTS_PER_ADD } from '@/features/products/lots';
import type { ProductInput } from '@/types/product';

const input: ProductInput = {
  name: 'Beurre doux',
  category: 'produits_laitiers',
  quantity: '250 g',
  expiresAt: '2026-12-30',
  location: 'frigo',
  source: 'manual',
};

describe('plusieurs lots d’un coup', () => {
  it('crée un produit par lot, chacun indépendant', () => {
    const lots = lotInputs(input, 4);
    expect(lots).toHaveLength(4);
    expect(lots.every((lot) => lot.name === 'Beurre doux' && lot.quantity === '250 g')).toBe(true);
    lots[0]!.name = 'modifié';
    expect(lots[1]!.name).toBe('Beurre doux');
  });

  it('reste raisonnable : au moins 1, au plus 20', () => {
    expect(lotInputs(input, 0)).toHaveLength(1);
    expect(lotInputs(input, 2.7)).toHaveLength(2);
    expect(lotInputs(input, 500)).toHaveLength(MAX_LOTS_PER_ADD);
  });

  it('respecte les places libres de la version gratuite, sans bloquer l’ajout d’un lot', () => {
    expect(allowedLots(Number.POSITIVE_INFINITY)).toBe(MAX_LOTS_PER_ADD);
    expect(allowedLots(3)).toBe(3);
    expect(allowedLots(0)).toBe(1);
  });
});
