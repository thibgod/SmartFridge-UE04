import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { useSettings } from '@/features/settings/SettingsProvider';
import { createImageCacheRepository } from '@/repositories/imageCacheRepository';
import { commonsThumbUrl, findCatalogImage, imageCacheKey, searchWikipediaImage } from '@/services/images/foodImages';

interface ImagesContextValue {
  enabled: boolean;
  /** Résultat déjà connu (undefined = jamais cherché). */
  peek: (key: string) => string | null | undefined;
  resolve: (name: string) => Promise<string | null>;
  clearCache: () => Promise<void>;
}

const ImagesContext = createContext<ImagesContextValue | null>(null);

export function ImagesProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const repository = useMemo(() => createImageCacheRepository(db), [db]);
  const enabled = useSettings().settings.autoImages;
  const memory = useRef(new Map<string, string | null>());
  const inflight = useRef(new Map<string, Promise<string | null>>());

  const peek = useCallback((key: string) => memory.current.get(key), []);

  const resolve = useCallback(
    (name: string) => {
      const key = imageCacheKey(name);
      if (!key) return Promise.resolve(null);
      const known = memory.current.get(key);
      if (known !== undefined) return Promise.resolve(known);
      const pending = inflight.current.get(key);
      if (pending) return pending;

      const task = (async () => {
        const cached = await repository.get(key).catch(() => null);
        if (cached) return cached.url;
        const outcome = await searchWikipediaImage(name);
        if (outcome.status === 'error') return null; // hors ligne : on retentera plus tard
        const url = outcome.status === 'found' ? outcome.url : null;
        await repository.set(key, url).catch(() => undefined);
        return url;
      })().then((url) => {
        memory.current.set(key, url);
        inflight.current.delete(key);
        return url;
      });
      inflight.current.set(key, task);
      return task;
    },
    [repository],
  );

  const clearCache = useCallback(async () => {
    memory.current.clear();
    await repository.clear();
  }, [repository]);

  const value = useMemo(() => ({ enabled, peek, resolve, clearCache }), [enabled, peek, resolve, clearCache]);
  return <ImagesContext.Provider value={value}>{children}</ImagesContext.Provider>;
}

export function useImages(): ImagesContextValue {
  const context = useContext(ImagesContext);
  if (!context) throw new Error('useImages doit être utilisé dans <ImagesProvider>.');
  return context;
}

/**
 * Image d’un produit : photo Open Food Facts si présente, sinon illustration automatique
 * (catalogue vérifié puis Wikipédia). null → l’appelant affiche l’icône de catégorie.
 */
export function useFoodImage(name: string, explicitUri?: string, width = 480): string | null {
  const { enabled, peek, resolve } = useImages();
  const catalog = enabled && !explicitUri ? findCatalogImage(name, width) : null;
  const needsLookup = enabled && !explicitUri && !catalog && name.trim().length >= 3;
  const key = needsLookup ? imageCacheKey(name) : '';
  const [found, setFound] = useState<{ key: string; url: string | null } | null>(null);

  useEffect(() => {
    if (!needsLookup || peek(key) !== undefined) return;
    let active = true;
    resolve(name).then((url) => {
      if (active) setFound({ key, url });
    });
    return () => {
      active = false;
    };
  }, [needsLookup, key, name, peek, resolve]);

  if (explicitUri) return explicitUri;
  if (catalog) return catalog;
  if (!needsLookup) return null;
  const known = peek(key);
  if (known !== undefined) return known;
  return found?.key === key ? found.url : null;
}

/** Illustration fixe (recettes, conseils), désactivée avec les images automatiques. */
export function useCatalogImage(file: string | undefined, width = 640): string | null {
  const { enabled } = useImages();
  return enabled && file ? commonsThumbUrl(file, width) : null;
}
