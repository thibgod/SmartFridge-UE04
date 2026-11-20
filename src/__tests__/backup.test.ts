import { sanitizeSettings } from '@/repositories/settingsRepository';
import { BackupError, buildBackup, parseBackup } from '@/services/backup/format';
import type { Product } from '@/types/product';
import { DEFAULT_SETTINGS } from '@/types/settings';

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Yaourt',
  category: 'produits_laitiers',
  quantity: '4',
  expiresAt: '2026-10-20',
  location: 'frigo',
  price: 1.6,
  source: 'manual',
  status: 'active',
  addedAt: '2026-10-01T08:00:00.000Z',
  updatedAt: '2026-10-01T08:00:00.000Z',
  ...overrides,
});

describe('sauvegarde', () => {
  it('fait un aller-retour sans perte', () => {
    const items = [product(), product({ id: 'p2', status: 'discarded', closedAt: '2026-10-05T10:00:00.000Z' })];
    const file = buildBackup(items, { ...DEFAULT_SETTINGS, reminderHour: 18, onboardingDone: true, swipeHintSeen: true });
    const parsed = parseBackup(JSON.stringify(file));
    expect(parsed.products).toEqual(items);
    expect(parsed.settings).toMatchObject({ reminderHour: 18 });
    expect(parsed.settings).not.toHaveProperty('onboardingDone');
    expect(parsed.settings).not.toHaveProperty('swipeHintSeen');
    expect(parsed.settings).not.toHaveProperty('premiumCached');
    expect(parsed.settings).not.toHaveProperty('receiptUsage');
    expect(parsed.skipped).toBe(0);
  });

  it('ignore les entrées invalides ou en double et corrige les valeurs inconnues', () => {
    const parsed = parseBackup(
      JSON.stringify({
        format: 'smartfridge-backup',
        version: 1,
        products: [
          product({ category: 'inconnue' as never, location: 'cave' as never, price: -3 }),
          product(), // doublon d’identifiant
          { id: 'x', name: '', expiresAt: '2026-10-20', addedAt: '2026-10-01T08:00:00Z' },
          { id: 'y', name: 'Date fausse', expiresAt: '2026-02-30', addedAt: '2026-10-01T08:00:00Z' },
          'pas un objet',
        ],
      }),
    );
    expect(parsed.products).toHaveLength(1);
    expect(parsed.products[0]).toMatchObject({ category: 'autre', location: 'frigo', price: undefined });
    expect(parsed.skipped).toBe(4);
  });

  it('refuse les fichiers étrangers ou trop récents', () => {
    expect(() => parseBackup('pas du json')).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ format: 'autre-app', version: 1, products: [] }))).toThrow(BackupError);
    expect(() => parseBackup(JSON.stringify({ format: 'smartfridge-backup', version: 99, products: [] }))).toThrow(
      /plus récente/,
    );
  });
});

describe('réglages', () => {
  it('retombe sur les valeurs par défaut si une valeur est hors limites', () => {
    expect(sanitizeSettings({ reminderHour: 42, reminderDaysBefore: 9, urgentThresholdDays: 3, remindersEnabled: 'oui' })).toEqual(
      { ...DEFAULT_SETTINGS, urgentThresholdDays: 3 },
    );
  });
});
