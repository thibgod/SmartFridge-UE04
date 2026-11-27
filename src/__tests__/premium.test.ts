import { RECIPES } from '@/data/recipes';
import {
  isStatsFeatureLocked,
  asPremiumReason,
  FREE_PRODUCT_LIMIT,
  FREE_RECIPE_IDS,
  isRecipeLocked,
  monthKey,
  recordReceipt,
  remainingProductSlots,
  remainingReceipts,
} from '@/features/premium/limits';
import { buildOffers, PLANS, planForSku } from '@/features/premium/plans';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { buildBackup, parseBackup } from '@/services/backup/format';

describe('limites de la version gratuite', () => {
  it('compte les places restantes sur 30 produits, sans limite avec Premium', () => {
    expect(FREE_PRODUCT_LIMIT).toBe(30);
    expect(remainingProductSlots(0, false)).toBe(30);
    expect(remainingProductSlots(28, false)).toBe(2);
    // Au-delà (abonnement terminé), rien n’est retiré : simplement plus de place.
    expect(remainingProductSlots(42, false)).toBe(0);
    expect(remainingProductSlots(42, true)).toBe(Number.POSITIVE_INFINITY);
  });

  it('offre 15 recettes existantes et verrouille les autres', () => {
    const ids = new Set(RECIPES.map((r) => r.id));
    expect(FREE_RECIPE_IDS.size).toBe(15);
    FREE_RECIPE_IDS.forEach((id) => expect(ids.has(id)).toBe(true));
    expect(RECIPES.filter((r) => isRecipeLocked(r.id, false))).toHaveLength(RECIPES.length - 15);
    expect(RECIPES.some((r) => isRecipeLocked(r.id, true))).toBe(false);
  });

  it('limite à 3 tickets par mois calendaire, compteur remis à zéro chaque mois', () => {
    const oct = new Date(2026, 9, 21);
    const nov = new Date(2026, 10, 2);
    expect(monthKey(oct)).toBe('2026-10');
    let usage = recordReceipt(null, oct);
    usage = recordReceipt(usage, oct);
    expect(remainingReceipts(usage, oct, false)).toBe(1);
    usage = recordReceipt(usage, oct);
    expect(remainingReceipts(usage, oct, false)).toBe(0);
    expect(remainingReceipts(usage, oct, true)).toBe(Number.POSITIVE_INFINITY);
    expect(remainingReceipts(usage, nov, false)).toBe(3);
    expect(recordReceipt(usage, nov)).toEqual({ month: '2026-11', count: 1 });
  });

  it('ignore une raison inconnue dans le lien vers l’offre', () => {
    expect(asPremiumReason('recipes')).toBe('recipes');
    expect(asPremiumReason('nimporte')).toBe('settings');
    expect(asPremiumReason(undefined)).toBe('settings');
  });
});

describe('offres du store', () => {
  it('affiche les prix indicatifs tant que le store n’a pas répondu, achat impossible', () => {
    const offers = buildOffers([]);
    expect(offers.map((o) => [o.id, o.price, o.available])).toEqual([
      ['yearly', '14,99 €', false],
      ['monthly', '1,99 €', false],
    ]);
  });

  it('prend le prix du store, l’essai gratuit et le jeton d’offre Android', () => {
    const [yearly, monthly] = buildOffers([
      {
        id: PLANS.yearly.sku,
        displayPrice: '14,99 €',
        price: 14.99,
        currency: 'EUR',
        subscriptionOffers: [
          { displayPrice: '14,99 €', paymentMode: 'pay-as-you-go', offerTokenAndroid: 'base' },
          { displayPrice: '0 €', paymentMode: 'free-trial', offerTokenAndroid: 'trial' },
        ],
      },
      { id: PLANS.monthly.sku, displayPrice: '1,99 €', price: 1.99, currency: 'EUR', introductoryPricePaymentModeIOS: 'empty' },
    ]);
    expect(yearly).toMatchObject({ available: true, hasFreeTrial: true, offerTokenAndroid: 'trial' });
    expect(yearly?.monthlyEquivalent?.replace(/\s/g, ' ')).toBe('1,25 € par mois');
    expect(monthly).toMatchObject({ available: true, hasFreeTrial: false, price: '1,99 €' });
    expect(planForSku(PLANS.monthly.sku)).toBe('monthly');
    expect(planForSku('autre')).toBeNull();
  });
});

describe('Premium et sauvegardes', () => {
  it('une sauvegarde importée n’accorde jamais Premium ni ne remet les quotas à zéro', () => {
    const file = buildBackup([], { ...DEFAULT_SETTINGS, premiumCached: true, receiptUsage: { month: '2026-10', count: 3 } });
    expect(JSON.stringify(file)).not.toContain('premiumCached');
    const forged = JSON.stringify({ ...file, settings: { ...file.settings, premiumCached: true, receiptUsage: null } });
    const parsed = parseBackup(forged);
    expect(parsed.settings).not.toHaveProperty('premiumCached');
    expect(parsed.settings).not.toHaveProperty('receiptUsage');
  });
});

describe('Bilan : ce qui est offert et ce qui est réservé à Premium', () => {
  it('offre les médailles à tous, avec ou sans Premium', () => {
    expect(isStatsFeatureLocked('badges', false)).toBe(false);
    expect(isStatsFeatureLocked('badges', true)).toBe(false);
  });

  it('réserve le score, l’impact, les graphiques, les périodes et l’export à Premium', () => {
    for (const feature of ['score', 'impact', 'charts', 'periods', 'export'] as const) {
      expect(isStatsFeatureLocked(feature, false)).toBe(true);
      expect(isStatsFeatureLocked(feature, true)).toBe(false);
    }
  });
});
