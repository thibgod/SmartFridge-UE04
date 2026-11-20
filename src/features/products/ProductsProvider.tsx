import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';

import { createProductRepository } from '@/repositories/productRepository';
import { usePremium } from '@/features/premium/PremiumProvider';
import { useSettings } from '@/features/settings/SettingsProvider';
import { prunePhotos } from '@/services/photos';
import { syncWidget } from '@/services/widget';
import { ensurePermission, syncExpiryReminders, type ReminderOptions } from '@/services/notifications';
import type { ClosedProductStatus, Product, ProductInput } from '@/types/product';

interface ProductsContextValue {
  products: Product[];
  activeProducts: Product[];
  isLoading: boolean;
  loadError: string | null;
  addProduct: (input: ProductInput) => Promise<Product>;
  addProducts: (inputs: readonly ProductInput[]) => Promise<Product[]>;
  updateProduct: (id: string, input: ProductInput) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  closeProduct: (id: string, status: ClosedProductStatus) => Promise<void>;
  closeProducts: (ids: readonly string[], status: ClosedProductStatus) => Promise<void>;
  reopenProduct: (id: string) => Promise<void>;
  restoreProducts: (products: readonly Product[], mode: 'replace' | 'merge') => Promise<number>;
  clearHistory: () => Promise<void>;
  clearAll: () => Promise<void>;
  /** Demande l’autorisation des notifications si besoin, puis reprogramme les rappels. */
  requestNotifications: () => void;
  /** Incrémenté après chaque synchronisation des rappels (pour rafraîchir l’affichage). */
  remindersVersion: number;
  reload: () => void;
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

/**
 * Source de vérité de l’inventaire côté UI. Chaque mutation écrit en base puis relit
 * l’état complet ; les rappels sont réalignés dès que les produits ou les réglages changent.
 */
export function ProductsProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const repository = useMemo(() => createProductRepository(db), [db]);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [loadRequest, setLoadRequest] = useState(0);
  const [permissionVersion, setPermissionVersion] = useState(0);
  const [remindersVersion, setRemindersVersion] = useState(0);

  // Seuls les réglages de rappel déclenchent une reprogrammation.
  const { remindersEnabled, reminderHour, reminderDaysBefore, urgentThresholdDays } = useSettings().settings;
  const { isPremium } = usePremium();
  const reminderOptions = useMemo<ReminderOptions>(
    () => ({ enabled: remindersEnabled, hour: reminderHour, daysBefore: reminderDaysBefore }),
    [remindersEnabled, reminderHour, reminderDaysBefore],
  );

  // Les synchronisations sont sérialisées pour ne jamais s’entrecroiser.
  const syncQueue = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    if (isLoading) return;
    syncQueue.current = syncQueue.current
      .then(() => syncExpiryReminders(products, reminderOptions))
      // Les notifications ne doivent jamais bloquer ni faire échouer une action utilisateur.
      .catch((error: unknown) => console.warn('[SmartFridge] Synchronisation des rappels impossible', error))
      .finally(() => setRemindersVersion((n) => n + 1));
  }, [products, reminderOptions, permissionVersion, isLoading]);

  // Widget d’écran d’accueil : réaligné à chaque changement (et au retour dans l’app, via permissionVersion).
  useEffect(() => {
    if (isLoading) return;
    void syncWidget(products, urgentThresholdDays, isPremium);
  }, [products, urgentThresholdDays, isPremium, permissionVersion, isLoading]);

  // Au retour dans l’app : retente les rappels en échec et prend en compte une autorisation
  // accordée entre-temps dans les réglages du téléphone.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setPermissionVersion((n) => n + 1);
    });
    return () => subscription.remove();
  }, []);

  const applySnapshot = useCallback((all: Product[]) => setProducts(all), []);

  const refresh = useCallback(async () => {
    applySnapshot(await repository.getAll());
  }, [repository, applySnapshot]);

  // Chargement initial, puis à chaque demande de rechargement (bouton « Réessayer »).
  useEffect(() => {
    let active = true;
    repository
      .getAll()
      .then((all) => {
        if (!active) return;
        applySnapshot(all);
        setLoadError(null);
        // Au chargement, aucun formulaire n’est ouvert : les photos non référencées sont orphelines.
        try {
          prunePhotos(all.map((p) => p.imageUri));
        } catch (error) {
          console.warn('[SmartFridge] Nettoyage des photos impossible', error);
        }
      })
      .catch((error: unknown) => {
        console.error('[SmartFridge] Lecture de la base impossible', error);
        if (active) setLoadError('Impossible de lire vos produits. Réessayez dans un instant.');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repository, applySnapshot, loadRequest]);

  const reload = useCallback(() => {
    setIsLoading(true);
    setLoadRequest((n) => n + 1);
  }, []);

  /**
   * Moment opportun pour demander l’autorisation : juste après un ajout.
   * Non bloquant : le formulaire se ferme sans attendre la réponse de l’utilisateur.
   */
  const requestPermissionAndSync = useCallback(() => {
    ensurePermission()
      .then((state) => {
        if (state === 'granted') setPermissionVersion((n) => n + 1);
      })
      .catch((error: unknown) => console.warn('[SmartFridge] Permission de notification', error));
  }, []);

  const addProduct = useCallback(
    async (input: ProductInput) => {
      const created = await repository.create(input);
      await refresh();
      requestPermissionAndSync();
      return created;
    },
    [repository, refresh, requestPermissionAndSync],
  );

  const addProducts = useCallback(
    async (inputs: readonly ProductInput[]) => {
      const created = await repository.createMany(inputs);
      await refresh();
      requestPermissionAndSync();
      return created;
    },
    [repository, refresh, requestPermissionAndSync],
  );

  const updateProduct = useCallback(
    async (id: string, input: ProductInput) => {
      await repository.update(id, input);
      await refresh();
    },
    [repository, refresh],
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      await repository.remove(id);
      await refresh();
    },
    [repository, refresh],
  );

  const closeProduct = useCallback(
    async (id: string, status: ClosedProductStatus) => {
      await repository.close(id, status);
      await refresh();
    },
    [repository, refresh],
  );

  const closeProducts = useCallback(
    async (ids: readonly string[], status: ClosedProductStatus) => {
      await repository.closeMany(ids, status);
      await refresh();
    },
    [repository, refresh],
  );

  const reopenProduct = useCallback(
    async (id: string) => {
      await repository.reopen(id);
      await refresh();
    },
    [repository, refresh],
  );

  const restoreProducts = useCallback(
    async (items: readonly Product[], mode: 'replace' | 'merge') => {
      const count = await repository.restore(items, mode);
      await refresh();
      return count;
    },
    [repository, refresh],
  );

  const clearHistory = useCallback(async () => {
    await repository.clearHistory();
    await refresh();
  }, [repository, refresh]);

  const clearAll = useCallback(async () => {
    await repository.clearAll();
    await refresh();
  }, [repository, refresh]);

  const activeProducts = useMemo(() => products.filter((p) => p.status === 'active'), [products]);

  const value = useMemo<ProductsContextValue>(
    () => ({
      products,
      activeProducts,
      isLoading,
      loadError,
      addProduct,
      addProducts,
      updateProduct,
      deleteProduct,
      closeProduct,
      closeProducts,
      reopenProduct,
      restoreProducts,
      clearHistory,
      clearAll,
      requestNotifications: requestPermissionAndSync,
      remindersVersion,
      reload,
    }),
    [
      products,
      activeProducts,
      isLoading,
      loadError,
      addProduct,
      addProducts,
      updateProduct,
      deleteProduct,
      closeProduct,
      closeProducts,
      reopenProduct,
      restoreProducts,
      clearHistory,
      clearAll,
      requestPermissionAndSync,
      remindersVersion,
      reload,
    ],
  );

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts(): ProductsContextValue {
  const context = useContext(ProductsContext);
  if (!context) throw new Error('useProducts doit être utilisé dans <ProductsProvider>.');
  return context;
}
