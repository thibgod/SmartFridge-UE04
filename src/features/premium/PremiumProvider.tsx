import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';

import { useSettings } from '@/features/settings/SettingsProvider';

import { recordReceipt, remainingReceipts, type PremiumReason } from './limits';
import { buildOffers, PLANS, planForSku, PREMIUM_SKUS, type PlanId, type PlanOffer, type StoreSubscription } from './plans';

/**
 * Abonnement SmartFridge Premium, par les achats natifs (StoreKit 2 sur iPhone, Google Play Billing
 * sur Android) via expo-iap. Aucun serveur : l’abonnement actif est demandé au store à chaque
 * lancement et à chaque retour dans l’app. Le dernier état connu est gardé en réglage pour qu’un
 * abonné hors ligne ne perde pas Premium.
 */

export type PurchaseOutcome = 'success' | 'cancelled' | 'pending' | 'error' | 'unavailable';
export type StoreStatus = 'loading' | 'ready' | 'unavailable';

interface PremiumContextValue {
  isPremium: boolean;
  status: StoreStatus;
  offers: PlanOffer[];
  activePlan: PlanId | null;
  purchasing: PlanId | null;
  purchase: (plan: PlanId) => Promise<PurchaseOutcome>;
  /** Restaure les achats ; renvoie l’état Premium obtenu. */
  restore: () => Promise<boolean>;
  /** Ouvre la gestion de l’abonnement (App Store ou Google Play). */
  manage: () => Promise<void>;
  /** Ouvre l’écran d’offre en expliquant ce qui l’a déclenché. */
  showPaywall: (reason: PremiumReason) => void;
  receiptsLeft: number;
  recordReceiptScan: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

type IapModule = typeof import('expo-iap');
const PURCHASE_TIMEOUT_MS = 5 * 60_000;

export function PremiumProvider({ children }: PropsWithChildren) {
  const { settings, updateSettings } = useSettings();
  const [isPremium, setPremium] = useState(settings.premiumCached);
  const [activePlan, setActivePlan] = useState<PlanId | null>(null);
  const [status, setStatus] = useState<StoreStatus>(Platform.OS === 'web' ? 'unavailable' : 'loading');
  const [products, setProducts] = useState<StoreSubscription[]>([]);
  const [purchasing, setPurchasing] = useState<PlanId | null>(null);
  const iap = useRef<IapModule | null>(null);
  const pending = useRef<((outcome: PurchaseOutcome) => void) | null>(null);
  const premiumCached = settings.premiumCached;

  const settle = useCallback((outcome: PurchaseOutcome) => {
    pending.current?.(outcome);
    pending.current = null;
    setPurchasing(null);
  }, []);

  /** Demande au store l’abonnement actif (vérifié par StoreKit / Google Play) et le mémorise. */
  const refresh = useCallback(async (): Promise<boolean> => {
    const module = iap.current;
    if (!module) return premiumCached;
    const subscriptions = await module.getActiveSubscriptions([...PREMIUM_SKUS]);
    const active = subscriptions.find((sub) => sub.isActive && PREMIUM_SKUS.includes(sub.productId));
    const nowPremium = active !== undefined;
    setPremium(nowPremium);
    setActivePlan(planForSku(active?.productId));
    if (nowPremium !== premiumCached) await updateSettings({ premiumCached: nowPremium }).catch(() => undefined);
    return nowPremium;
  }, [premiumCached, updateSettings]);

  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let active = true;
    const subscriptions: { remove: () => void }[] = [];

    (async () => {
      try {
        const module = await import('expo-iap');
        await module.initConnection();
        if (!active) return;
        iap.current = module;

        subscriptions.push(
          module.purchaseUpdatedListener((purchase) => {
            if (!PREMIUM_SKUS.includes(purchase.productId)) return;
            void (async () => {
              try {
                // Google Play rembourse un achat non confirmé sous 3 jours : on le confirme toujours.
                await module.finishTransaction({ purchase, isConsumable: false });
              } catch (error) {
                console.warn('[SmartFridge] Confirmation de l’achat impossible', error);
              }
              const granted = await refreshRef.current().catch(() => false);
              settle(granted ? 'success' : 'pending');
            })();
          }),
          module.purchaseErrorListener((error) => {
            settle(error.code === module.ErrorCode.UserCancelled ? 'cancelled' : 'error');
          }),
        );

        const fetched = (await module.fetchProducts({ skus: [...PREMIUM_SKUS], type: 'subs' })) as StoreSubscription[] | null;
        if (!active) return;
        setProducts(fetched ?? []);
        await refreshRef.current();
        if (active) setStatus('ready');
      } catch (error) {
        // Expo Go, simulateur sans configuration StoreKit, store injoignable : l’app reste utilisable.
        console.warn('[SmartFridge] Achats intégrés indisponibles', error);
        if (active) setStatus('unavailable');
      }
    })();

    // Un abonnement peut expirer ou être renouvelé pendant que l’app est en arrière-plan.
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshRef.current().catch(() => undefined);
    });

    return () => {
      active = false;
      appState.remove();
      subscriptions.forEach((subscription) => subscription.remove());
      const module = iap.current;
      iap.current = null;
      void module?.endConnection().catch(() => undefined);
    };
  }, [settle]);

  const offers = useMemo(() => buildOffers(products), [products]);

  const purchase = useCallback(
    async (plan: PlanId): Promise<PurchaseOutcome> => {
      const module = iap.current;
      const offer = offers.find((o) => o.id === plan);
      if (!module || !offer?.available) return 'unavailable';
      const sku = PLANS[plan].sku;
      setPurchasing(plan);
      const outcome = new Promise<PurchaseOutcome>((resolve) => {
        pending.current = resolve;
      });
      // Sans réponse du store (fenêtre de paiement fermée par le système), on rend la main.
      const timer = setTimeout(() => settle('error'), PURCHASE_TIMEOUT_MS);
      try {
        await module.requestPurchase({
          request: {
            apple: { sku },
            google: {
              skus: [sku],
              subscriptionOffers: offer.offerTokenAndroid ? [{ sku, offerToken: offer.offerTokenAndroid }] : undefined,
            },
          },
          type: 'subs',
        });
      } catch {
        settle('error');
      }
      const result = await outcome;
      clearTimeout(timer);
      return result;
    },
    [offers, settle],
  );

  const restore = useCallback(async () => {
    const module = iap.current;
    if (!module) return isPremium;
    await module.restorePurchases().catch(() => undefined);
    return refreshRef.current();
  }, [isPremium]);

  const manage = useCallback(async () => {
    const module = iap.current;
    if (!module) return;
    await module.deepLinkToSubscriptions({
      skuAndroid: activePlan ? PLANS[activePlan].sku : PLANS.yearly.sku,
      packageNameAndroid: 'app.smartfridge.mobile',
    });
  }, [activePlan]);

  const showPaywall = useCallback((reason: PremiumReason) => {
    router.push({ pathname: '/premium', params: { reason } });
  }, []);

  const receiptsLeft = remainingReceipts(settings.receiptUsage, new Date(), isPremium);
  const receiptUsage = settings.receiptUsage;
  const recordReceiptScan = useCallback(async () => {
    await updateSettings({ receiptUsage: recordReceipt(receiptUsage, new Date()) });
  }, [receiptUsage, updateSettings]);

  const value = useMemo<PremiumContextValue>(
    () => ({
      isPremium,
      status,
      offers,
      activePlan,
      purchasing,
      purchase,
      restore,
      manage,
      showPaywall,
      receiptsLeft,
      recordReceiptScan,
    }),
    [isPremium, status, offers, activePlan, purchasing, purchase, restore, manage, showPaywall, receiptsLeft, recordReceiptScan],
  );

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium(): PremiumContextValue {
  const context = useContext(PremiumContext);
  if (!context) throw new Error('usePremium doit être utilisé dans <PremiumProvider>.');
  return context;
}
