import {
  buildWidgetProps,
  buildWidgetTimeline,
  buildWidgetSnapshot,
  parseWidgetSnapshot,
  propsFromSnapshot,
} from '@/features/widget/widgetData';
import type { Product } from '@/types/product';

const product = (overrides: Partial<Product>): Product => ({
  id: 'p',
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

const NOW = new Date(2026, 9, 15, 18);
const PRODUCTS = [
  product({ id: 'a', name: 'Yaourts', expiresAt: '2026-10-16' }),
  product({ id: 'b', name: 'Jambon', expiresAt: '2026-10-13' }),
  product({ id: 'c', name: 'Riz', expiresAt: '2027-05-01' }),
  product({ id: 'd', name: 'Crème', expiresAt: '2026-10-15' }),
  product({ id: 'e', name: 'Lait', expiresAt: '2026-10-17', status: 'consumed' }),
];

describe('widget « À consommer vite »', () => {
  it('liste les produits pressés (périmés compris), les plus urgents d’abord', () => {
    expect(buildWidgetProps(PRODUCTS, NOW, 3)).toEqual({
      items: [
        { name: 'Jambon', when: 'Périmé (2 j)', level: 'expired' },
        { name: 'Crème', when: 'Aujourd’hui', level: 'urgent' },
        { name: 'Yaourts', when: 'Demain', level: 'urgent' },
      ],
      urgentCount: 2,
      expiredCount: 1,
    });
  });

  it('prépare une semaine d’affichage, renouvelée chaque jour à minuit', () => {
    const timeline = buildWidgetTimeline(PRODUCTS, NOW, 3);
    expect(timeline).toHaveLength(7);
    expect(timeline[1]?.date).toEqual(new Date(2026, 9, 16));
    expect(timeline[1]?.props.items.find((i) => i.name === 'Yaourts')?.when).toBe('Aujourd’hui');
    expect(timeline[1]?.props.expiredCount).toBe(2);
  });
});

describe('copie de données du widget Android', () => {
  const active = (name: string, expiresAt: string, status: Product['status'] = 'active') =>
    ({
      id: name,
      name,
      expiresAt,
      status,
      category: 'autre',
      quantity: '1',
      location: 'frigo',
      source: 'manual',
      addedAt: '2026-11-01T08:00:00.000Z',
      updatedAt: '2026-11-01T08:00:00.000Z',
    }) as Product;
  const today = new Date(2026, 10, 5, 9, 0);

  it('sans abonnement, ne copie aucun produit et affiche l’invitation', () => {
    const snapshot = buildWidgetSnapshot([active('Lait', '2026-11-06')], 3, false);
    expect(snapshot.products).toEqual([]);
    expect(propsFromSnapshot(snapshot, today).locked).toBe(true);
  });

  it('avec Premium, ne garde que le nécessaire et recalcule les échéances le jour affiché', () => {
    const snapshot = buildWidgetSnapshot([active('Lait', '2026-11-08'), active('Pain', '2026-11-01', 'consumed')], 3, true);
    expect(snapshot.products).toEqual([{ name: 'Lait', expiresAt: '2026-11-08', status: 'active' }]);
    expect(propsFromSnapshot(snapshot, today).items[0]?.level).toBe('urgent');
    // Le widget se met à jour seul : le lendemain de la date, sans ouvrir l’app, le produit est périmé.
    expect(propsFromSnapshot(snapshot, new Date(2026, 10, 9, 9, 0)).expiredCount).toBe(1);
  });

  it('lit prudemment le fichier : illisible ou absent, le widget ne plante pas', () => {
    expect(parseWidgetSnapshot('pas du json')).toBeNull();
    expect(parseWidgetSnapshot('{"isPremium":true}')).toBeNull();
    expect(propsFromSnapshot(null, today).locked).toBe(true);
    const snapshot = buildWidgetSnapshot([active('Lait', '2026-11-08')], 3, true);
    expect(parseWidgetSnapshot(JSON.stringify(snapshot))).toEqual(snapshot);
  });
});
