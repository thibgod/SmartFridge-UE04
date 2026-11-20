/**
 * Formules d’abonnement. Les identifiants sont les mêmes dans App Store Connect et dans la
 * Google Play Console (groupe / produit « SmartFridge Premium »), voir PREMIUM.md.
 */

export type PlanId = 'yearly' | 'monthly';

export interface PlanDefinition {
  id: PlanId;
  sku: string;
  title: string;
  /** Prix indicatif, affiché tant que le store n’a pas répondu (le store fait foi). */
  fallbackPrice: string;
  /** « par an », « par mois ». */
  period: string;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  yearly: { id: 'yearly', sku: 'smartfridge_premium_yearly', title: 'Annuel', fallbackPrice: '14,99 €', period: 'par an' },
  monthly: { id: 'monthly', sku: 'smartfridge_premium_monthly', title: 'Mensuel', fallbackPrice: '1,99 €', period: 'par mois' },
};

export const PLAN_ORDER: readonly PlanId[] = ['yearly', 'monthly'];
export const PREMIUM_SKUS: readonly string[] = PLAN_ORDER.map((id) => PLANS[id].sku);
export const TRIAL_DAYS = 7;

export function planForSku(sku: string | null | undefined): PlanId | null {
  return PLAN_ORDER.find((id) => PLANS[id].sku === sku) ?? null;
}

/** Ce que l’écran d’offre affiche pour une formule, d’après le store quand il a répondu. */
export interface PlanOffer {
  id: PlanId;
  /** « 14,99 € » tel que le store le formate pour le pays de l’utilisateur. */
  price: string;
  /** Équivalent mensuel de l’annuel (« 1,25 € par mois »), quand le prix numérique est connu. */
  monthlyEquivalent: string | null;
  /** L’essai gratuit est proposé pour cette formule (le store décide de l’éligibilité). */
  hasFreeTrial: boolean;
  /** Le produit a été trouvé sur le store : on peut l’acheter. */
  available: boolean;
  /** Jeton d’offre Google Play, nécessaire pour souscrire une formule (et son essai). */
  offerTokenAndroid: string | null;
}

/** Sous-ensemble des produits renvoyés par expo-iap dont l’écran a besoin (iOS et Android). */
export interface StoreSubscription {
  id: string;
  displayPrice: string;
  price?: number | null;
  currency?: string | null;
  introductoryPricePaymentModeIOS?: string | null;
  subscriptionOffers?:
    | readonly {
        displayPrice: string;
        paymentMode?: string | null;
        offerTokenAndroid?: string | null;
      }[]
    | null;
}

function formatMonthly(price: number, currency: string | null | undefined): string | null {
  if (!currency) return null;
  try {
    const formatted = new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(
      Math.round((price / 12) * 100) / 100,
    );
    return `${formatted} par mois`;
  } catch {
    return null;
  }
}

/** Formules à afficher : prix du store s’il a répondu, prix indicatifs sinon (achat alors impossible). */
export function buildOffers(products: readonly StoreSubscription[]): PlanOffer[] {
  return PLAN_ORDER.map((id) => {
    const plan = PLANS[id];
    const product = products.find((p) => p.id === plan.sku);
    if (!product) {
      return {
        id,
        price: plan.fallbackPrice,
        monthlyEquivalent: null,
        hasFreeTrial: true,
        available: false,
        offerTokenAndroid: null,
      };
    }
    const offers = product.subscriptionOffers ?? [];
    const trialOffer = offers.find((offer) => offer.paymentMode === 'free-trial');
    // Android : on souscrit avec l’offre d’essai si elle existe, sinon avec l’offre de base.
    const offerToken = (trialOffer ?? offers[0])?.offerTokenAndroid ?? null;
    const hasFreeTrial = product.introductoryPricePaymentModeIOS === 'free-trial' || trialOffer !== undefined;
    return {
      id,
      price: product.displayPrice,
      monthlyEquivalent:
        id === 'yearly' && typeof product.price === 'number' ? formatMonthly(product.price, product.currency) : null,
      hasFreeTrial,
      available: true,
      offerTokenAndroid: offerToken,
    };
  });
}
