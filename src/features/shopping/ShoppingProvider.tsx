import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { createShoppingRepository } from '@/repositories/shoppingRepository';
import type { ShoppingItem, ShoppingItemInput } from '@/types/shopping';

import { prepareItems } from './shoppingLogic';

export interface AddItemsResult {
  added: ShoppingItem[];
  duplicates: string[];
}

interface ShoppingContextValue {
  items: ShoppingItem[];
  /** Nombre d’articles restant à acheter. */
  pendingCount: number;
  addItems: (inputs: readonly ShoppingItemInput[]) => Promise<AddItemsResult>;
  toggleItem: (item: ShoppingItem) => Promise<void>;
  updateItem: (id: string, patch: Pick<ShoppingItem, 'name' | 'quantity' | 'category'>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  removeItems: (ids: readonly string[]) => Promise<void>;
  /** Remet un article supprimé (bouton « Annuler »). */
  restoreItem: (item: ShoppingItem) => Promise<void>;
  clearChecked: () => Promise<void>;
  restoreItems: (items: readonly ShoppingItem[], mode: 'replace' | 'merge') => Promise<void>;
  clearAll: () => Promise<void>;
}

const ShoppingContext = createContext<ShoppingContextValue | null>(null);

/** Liste de courses : écrit en base puis relit l’état complet, comme l’inventaire. */
export function ShoppingProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const repository = useMemo(() => createShoppingRepository(db), [db]);
  const [items, setItems] = useState<ShoppingItem[]>([]);

  const refresh = useCallback(async () => setItems(await repository.getAll()), [repository]);

  useEffect(() => {
    let active = true;
    repository
      .getAll()
      .then((all) => active && setItems(all))
      .catch((error: unknown) => console.warn('[SmartFridge] Liste de courses illisible', error));
    return () => {
      active = false;
    };
  }, [repository]);

  const addItems = useCallback(
    async (inputs: readonly ShoppingItemInput[]) => {
      const { items: added, duplicates } = prepareItems(inputs, await repository.getAll());
      await repository.insertMany(added);
      await refresh();
      return { added, duplicates };
    },
    [repository, refresh],
  );

  const toggleItem = useCallback(
    async (item: ShoppingItem) => {
      await repository.setChecked(item.id, !item.checked);
      await refresh();
    },
    [repository, refresh],
  );

  const updateItem = useCallback(
    async (id: string, patch: Pick<ShoppingItem, 'name' | 'quantity' | 'category'>) => {
      await repository.update(id, patch);
      await refresh();
    },
    [repository, refresh],
  );

  const removeItem = useCallback(
    async (id: string) => {
      await repository.remove(id);
      await refresh();
    },
    [repository, refresh],
  );

  const removeItems = useCallback(
    async (ids: readonly string[]) => {
      await repository.removeMany(ids);
      await refresh();
    },
    [repository, refresh],
  );

  const restoreItem = useCallback(
    async (item: ShoppingItem) => {
      await repository.insertMany([item]);
      await refresh();
    },
    [repository, refresh],
  );

  const clearChecked = useCallback(async () => {
    await repository.clearChecked();
    await refresh();
  }, [repository, refresh]);

  const restoreItems = useCallback(
    async (restored: readonly ShoppingItem[], mode: 'replace' | 'merge') => {
      await repository.restore(restored, mode);
      await refresh();
    },
    [repository, refresh],
  );

  const clearAll = useCallback(async () => {
    await repository.clearAll();
    await refresh();
  }, [repository, refresh]);

  const pendingCount = useMemo(() => items.filter((item) => !item.checked).length, [items]);

  const value = useMemo(
    () => ({
      items,
      pendingCount,
      addItems,
      toggleItem,
      updateItem,
      removeItem,
      removeItems,
      restoreItem,
      clearChecked,
      restoreItems,
      clearAll,
    }),
    [items, pendingCount, addItems, toggleItem, updateItem, removeItem, removeItems, restoreItem, clearChecked, restoreItems, clearAll],
  );

  return <ShoppingContext.Provider value={value}>{children}</ShoppingContext.Provider>;
}

export function useShopping(): ShoppingContextValue {
  const context = useContext(ShoppingContext);
  if (!context) throw new Error('useShopping doit être utilisé dans <ShoppingProvider>.');
  return context;
}
