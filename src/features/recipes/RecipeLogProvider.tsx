import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { createRecipeLogRepository } from '@/repositories/recipeLogRepository';
import type { CookedEntry, RecipeStats } from '@/types/recipeLog';

interface RecipeLogContextValue {
  favorites: ReadonlySet<string>;
  history: CookedEntry[];
  toggleFavorite: (recipeId: string) => Promise<boolean>;
  logCooked: (recipeId: string, savedCount: number) => Promise<CookedEntry>;
  removeEntry: (id: string) => Promise<void>;
  statsFor: (recipeId: string) => RecipeStats;
  restoreLog: (favorites: readonly string[], history: readonly CookedEntry[], mode: 'replace' | 'merge') => Promise<void>;
  clearLog: () => Promise<void>;
}

const RecipeLogContext = createContext<RecipeLogContextValue | null>(null);

/** Favoris et historique des recettes cuisinées (local, comme le reste des données). */
export function RecipeLogProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const repository = useMemo(() => createRecipeLogRepository(db), [db]);
  const [favorites, setFavorites] = useState<ReadonlySet<string>>(new Set());
  const [history, setHistory] = useState<CookedEntry[]>([]);

  const refresh = useCallback(async () => {
    const [fav, hist] = await Promise.all([repository.getFavorites(), repository.getHistory()]);
    setFavorites(new Set(fav));
    setHistory(hist);
  }, [repository]);

  // Chargement initial (même schéma que la liste de courses : l’état n’est écrit qu’au retour de la lecture).
  useEffect(() => {
    let active = true;
    Promise.all([repository.getFavorites(), repository.getHistory()])
      .then(([fav, hist]) => {
        if (!active) return;
        setFavorites(new Set(fav));
        setHistory(hist);
      })
      .catch((error: unknown) => console.warn('[SmartFridge] Historique des recettes illisible', error));
    return () => {
      active = false;
    };
  }, [repository]);

  const toggleFavorite = useCallback(
    async (recipeId: string) => {
      const next = !favorites.has(recipeId);
      await repository.setFavorite(recipeId, next);
      await refresh();
      return next;
    },
    [favorites, repository, refresh],
  );

  const logCooked = useCallback(
    async (recipeId: string, savedCount: number) => {
      const entry = await repository.logCooked(recipeId, savedCount);
      await refresh();
      return entry;
    },
    [repository, refresh],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      await repository.removeEntry(id);
      await refresh();
    },
    [repository, refresh],
  );

  const statsFor = useCallback(
    (recipeId: string): RecipeStats => {
      const entries = history.filter((entry) => entry.recipeId === recipeId);
      return { timesCooked: entries.length, lastCookedAt: entries[0]?.cookedAt };
    },
    [history],
  );

  const restoreLog = useCallback(
    async (fav: readonly string[], hist: readonly CookedEntry[], mode: 'replace' | 'merge') => {
      await repository.restore(fav, hist, mode);
      await refresh();
    },
    [repository, refresh],
  );

  const clearLog = useCallback(async () => {
    await repository.clearAll();
    await refresh();
  }, [repository, refresh]);

  const value = useMemo(
    () => ({ favorites, history, toggleFavorite, logCooked, removeEntry, statsFor, restoreLog, clearLog }),
    [favorites, history, toggleFavorite, logCooked, removeEntry, statsFor, restoreLog, clearLog],
  );

  return <RecipeLogContext.Provider value={value}>{children}</RecipeLogContext.Provider>;
}

export function useRecipeLog(): RecipeLogContextValue {
  const context = useContext(RecipeLogContext);
  if (!context) throw new Error('useRecipeLog doit être utilisé dans <RecipeLogProvider>.');
  return context;
}
