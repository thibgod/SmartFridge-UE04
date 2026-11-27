import {
  formatPacks,
  householdEquivalents,
  householdLabel,
  shopIntervalDays,
  suggestRestock,
} from '@/features/shopping/restockPlan';
import { sanitizeSettings } from '@/repositories/settingsRepository';
import { buildBackup, parseBackup } from '@/services/backup/format';
import type { Product } from '@/types/product';
import { DEFAULT_SETTINGS } from '@/types/settings';
import type { ShoppingItem } from '@/types/shopping';

const NOW = new Date(2026, 9, 15, 10);
let nextId = 0;
const at = (day: string) => new Date(`${day}T10:00:00`).toISOString();

/** Un lot acheté le jour `bought`, clôturé le jour `closed` (consommé par défaut). */
const lot = (name: string, bought: string, overrides: Partial<Product> & { closed?: string } = {}): Product => {
  const { closed, ...rest } = overrides;
  nextId += 1;
  return {
    id: String(nextId),
    name,
    category: 'produits_laitiers',
    quantity: '4 x 125 g',
    expiresAt: '2026-11-30',
    location: 'frigo',
    source: 'manual',
    status: closed ? 'consumed' : 'active',
    addedAt: at(bought),
    updatedAt: at(closed ?? bought),
    ...(closed ? { closedAt: at(closed) } : {}),
    ...rest,
  };
};

/** Courses hebdomadaires : un autre produit acheté le même jour, pour que l’app reconnaisse le jour de courses. */
const weekly = (days: readonly string[]) =>
  days.map((day) => lot('Pain', day, { category: 'feculents', quantity: '1', closed: day }));
const SHOP_DAYS = ['2026-09-17', '2026-09-24', '2026-10-01', '2026-10-08'];

const pick = (suggestions: ReturnType<typeof suggestRestock>, name: string) => suggestions.find((s) => s.name === name);

const item = (name: string): ShoppingItem => ({
  id: name,
  name,
  category: 'autre',
  quantity: '',
  checked: false,
  source: 'manual',
  addedAt: at('2026-10-14'),
});

describe('rythme des courses', () => {
  it('apprend l’intervalle habituel entre deux courses', () => {
    expect(shopIntervalDays(weekly(SHOP_DAYS).flatMap((p) => [p, { ...p, id: `${p.id}b` }]))).toBe(7);
    const twiceAWeek = ['2026-10-01', '2026-10-04', '2026-10-08', '2026-10-11'];
    expect(shopIntervalDays(weekly(twiceAWeek).flatMap((p) => [p, { ...p, id: `${p.id}b` }]))).toBe(3);
  });

  it('suppose une course par semaine sans historique', () => {
    expect(shopIntervalDays([])).toBe(7);
  });
});

describe('quantités à racheter', () => {
  const yaourts = SHOP_DAYS.map((day, i) => lot('Yaourts nature', day, { closed: SHOP_DAYS[i + 1] ?? '2026-10-14' }));
  const history = [...weekly(SHOP_DAYS), ...yaourts];

  it('propose un lot quand il en part un par semaine et qu’il n’y en a plus', () => {
    expect(pick(suggestRestock(history, [], { now: NOW }), 'Yaourts nature')).toEqual({
      name: 'Yaourts nature',
      category: 'produits_laitiers',
      quantity: '4 x 125 g',
      packs: 1,
      reason: 'Environ 1 par semaine · plus en stock',
      consumedCount: 4,
    });
    // Le pain, acheté à chaque course, est proposé lui aussi.
    expect(pick(suggestRestock(history, [], { now: NOW }), 'Pain')?.reason).toBe('Environ 1 par semaine · plus en stock');
  });

  it('ne propose rien quand le frigo en contient assez jusqu’aux prochaines courses', () => {
    expect(
      pick(suggestRestock([...history, lot('Yaourts nature', '2026-10-14')], [], { now: NOW }), 'Yaourts nature'),
    ).toBeUndefined();
  });

  it('ne compte pas un reste qui sera périmé avant d’être mangé', () => {
    const expiring = lot('Yaourts nature', '2026-10-14', { expiresAt: '2026-10-15' });
    expect(pick(suggestRestock([...history, expiring], [], { now: NOW }), 'Yaourts nature')?.reason).toBe(
      'Environ 1 par semaine · il en reste un peu',
    );
  });

  it('propose davantage pour un foyer plus grand tant que l’historique est court', () => {
    const pommes = [
      lot('Pommes', '2026-10-01', { category: 'fruits_legumes', quantity: '1 kg', closed: '2026-10-08' }),
      lot('Pommes', '2026-10-08', { category: 'fruits_legumes', quantity: '1 kg', closed: '2026-10-14' }),
    ];
    const packs = (adults: number, children = 0) =>
      pick(
        suggestRestock([...weekly(['2026-10-01', '2026-10-08']), ...pommes], [], { now: NOW, household: { adults, children } }),
        'Pommes',
      )?.packs ?? 0;
    expect(packs(1)).toBeGreaterThanOrEqual(1);
    expect(packs(4)).toBeGreaterThan(packs(1));
    expect(packs(2, 2)).toBeGreaterThan(packs(2));
  });

  it('suit l’historique du foyer une fois qu’il est assez long', () => {
    const withHousehold = suggestRestock(history, [], { now: NOW, household: { adults: 6, children: 0 } });
    expect(pick(withHousehold, 'Yaourts nature')?.packs).toBe(1);
  });

  it('réduit la quantité d’un produit souvent jeté et le dit', () => {
    const discard = (p: Product): Product => ({ ...p, status: 'discarded' });
    const wasted = yaourts.map((p, i) => (i === 1 || i === 2 ? discard(p) : p));
    const suggestion = pick(
      suggestRestock([...weekly(SHOP_DAYS), ...wasted, lot('Yaourts nature', '2026-10-11', { closed: '2026-10-14' })], [], {
        now: NOW,
      }),
      'Yaourts nature',
    );
    expect(suggestion?.reason).toContain('quantité réduite : 2 jetés sur 5');
  });

  it('ne propose plus un produit qu’on n’achète plus depuis longtemps', () => {
    const later = new Date(2027, 0, 20, 10);
    expect(pick(suggestRestock(history, [], { now: later }), 'Yaourts nature')).toBeUndefined();
    // Trois semaines sans achat pour un produit hebdomadaire : toujours proposé.
    expect(pick(suggestRestock(history, [], { now: new Date(2026, 9, 29, 10) }), 'Yaourts nature')).toBeDefined();
  });

  it('ne propose jamais ce qui est surtout jeté, ni ce qui est déjà sur la liste', () => {
    const salade = SHOP_DAYS.map((day) =>
      lot('Salade', day, { category: 'fruits_legumes', quantity: '1', status: 'discarded', closedAt: at(day) }),
    );
    expect(suggestRestock([...history, ...salade], [], { now: NOW }).map((s) => s.name)).not.toContain('Salade');
    expect(pick(suggestRestock(history, [item('yaourts nature')], { now: NOW }), 'Yaourts nature')).toBeUndefined();
  });

  it('ne pousse pas à acheter plus que ce qui sera mangé avant la date', () => {
    // Deux lots par semaine, mais le produit ne se garde que 2 jours : un seul lot à la fois.
    const fraises = SHOP_DAYS.flatMap((day, i) =>
      [0, 1].map(() =>
        lot('Fraises', day, {
          category: 'fruits_legumes',
          quantity: '250 g',
          expiresAt: new Date(new Date(`${day}T10:00:00`).getTime() + 2 * 86_400_000).toISOString().slice(0, 10),
          closed: SHOP_DAYS[i + 1] ?? '2026-10-14',
        }),
      ),
    );
    expect(pick(suggestRestock([...weekly(SHOP_DAYS), ...fraises], [], { now: NOW }), 'Fraises')?.packs).toBe(1);
  });
});

describe('foyer', () => {
  it('compte un enfant pour environ 0,7 adulte', () => {
    expect(householdEquivalents(null)).toBeNull();
    expect(householdEquivalents({ adults: 2, children: 1 })).toBeCloseTo(2.7);
    expect(householdLabel({ adults: 2, children: 1 })).toBe('2 adultes et 1 enfant');
    expect(householdLabel({ adults: 1, children: 0 })).toBe('1 adulte');
  });

  it('écrit la quantité dans l’unité d’achat habituelle', () => {
    expect(formatPacks(2, '500 g')).toBe('2 × 500 g');
    expect(formatPacks(1, '500 g')).toBe('500 g');
    expect(formatPacks(2, '6')).toBe('12');
    expect(formatPacks(1, '1')).toBe('');
    expect(formatPacks(3, '')).toBe('3');
  });

  it('valide la taille du foyer et la garde dans les sauvegardes', () => {
    expect(sanitizeSettings({ household: { adults: 2, children: 1 } }).household).toEqual({ adults: 2, children: 1 });
    expect(sanitizeSettings({ household: { adults: 0, children: 1 } }).household).toBeNull();
    expect(sanitizeSettings({ household: { adults: 2, children: 1.5 } }).household).toBeNull();
    expect(sanitizeSettings({}).household).toBeNull();
    const settings = { ...DEFAULT_SETTINGS, household: { adults: 3, children: 2 } };
    const parsed = parseBackup(JSON.stringify(buildBackup([], settings, NOW)));
    expect(parsed.settings?.household).toEqual({ adults: 3, children: 2 });
  });
});
