import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { usePremium } from '@/features/premium/PremiumProvider';
import { useProducts } from '@/features/products/ProductsProvider';
import { useSettings } from '@/features/settings/SettingsProvider';
import { createPlaceRepository } from '@/repositories/placeRepository';
import type { IconName } from '@/types/content';

import { canAddPlace, MAIN_PLACE, normalizePlaceName, validatePlaceName, type Place } from './places';

interface PlacesContextValue {
  /** Lieux en plus de la maison. */
  places: Place[];
  /** Maison puis lieux, dans l’ordre de création. */
  allPlaces: Place[];
  current: Place;
  setCurrent: (placeId: string) => void;
  canAdd: boolean;
  addPlace: (name: string, icon: IconName) => Promise<Place>;
  updatePlace: (id: string, name: string, icon: IconName) => Promise<void>;
  removePlace: (id: string) => Promise<void>;
  validateName: (name: string, editingId?: string) => string | null;
  restorePlaces: (places: readonly Place[], mode: 'replace' | 'merge') => Promise<void>;
  clearPlaces: () => Promise<void>;
}

const PlacesContext = createContext<PlacesContextValue | null>(null);

/**
 * Lieux (Premium). Créer un lieu demande l’abonnement ; à sa fin, les lieux restent visibles,
 * modifiables et supprimables : seule la création est bloquée, rien n’est perdu.
 */
export function PlacesProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const repository = useMemo(() => createPlaceRepository(db), [db]);
  const { settings, updateSettings } = useSettings();
  const { isPremium } = usePremium();
  const { reload: reloadProducts } = useProducts();
  const [places, setPlaces] = useState<Place[]>([]);

  const reload = useCallback(async () => {
    setPlaces(await repository.getAll());
  }, [repository]);

  useEffect(() => {
    let active = true;
    repository
      .getAll()
      .then((loaded) => {
        if (active) setPlaces(loaded);
      })
      .catch((error: unknown) => console.warn('[SmartFridge] Lieux illisibles', error));
    return () => {
      active = false;
    };
  }, [repository]);

  // Lieu enregistré introuvable (supprimé, sauvegarde importée) : retour à la maison.
  const current = places.find((place) => place.id === settings.currentPlaceId) ?? MAIN_PLACE;

  const setCurrent = useCallback((placeId: string) => void updateSettings({ currentPlaceId: placeId }), [updateSettings]);

  const validateName = useCallback((name: string, editingId?: string) => validatePlaceName(name, places, editingId), [places]);

  const addPlace = useCallback(
    async (name: string, icon: IconName) => {
      if (!canAddPlace(isPremium, places.length)) throw new Error('Création de lieu indisponible.');
      const error = validatePlaceName(name, places);
      if (error) throw new Error(error);
      const place = await repository.create(normalizePlaceName(name), icon);
      setPlaces((prev) => [...prev, place]);
      return place;
    },
    [isPremium, places, repository],
  );

  const updatePlace = useCallback(
    async (id: string, name: string, icon: IconName) => {
      const error = validatePlaceName(name, places, id);
      if (error) throw new Error(error);
      const clean = normalizePlaceName(name);
      await repository.update(id, clean, icon);
      setPlaces((prev) => prev.map((place) => (place.id === id ? { ...place, name: clean, icon } : place)));
    },
    [places, repository],
  );

  const removePlace = useCallback(
    async (id: string) => {
      await repository.remove(id);
      setPlaces((prev) => prev.filter((place) => place.id !== id));
      if (settings.currentPlaceId === id) await updateSettings({ currentPlaceId: MAIN_PLACE.id });
      // Les produits du lieu sont revenus à la maison en base : la liste en mémoire suit.
      reloadProducts();
    },
    [repository, settings.currentPlaceId, updateSettings, reloadProducts],
  );

  const restorePlaces = useCallback(
    async (restored: readonly Place[], mode: 'replace' | 'merge') => {
      await repository.restore(restored, mode);
      await reload();
    },
    [repository, reload],
  );

  const clearPlaces = useCallback(async () => {
    await repository.clearAll();
    setPlaces([]);
    await updateSettings({ currentPlaceId: MAIN_PLACE.id });
  }, [repository, updateSettings]);

  const value = useMemo<PlacesContextValue>(
    () => ({
      places,
      allPlaces: [MAIN_PLACE, ...places],
      current,
      setCurrent,
      canAdd: canAddPlace(isPremium, places.length),
      addPlace,
      updatePlace,
      removePlace,
      validateName,
      restorePlaces,
      clearPlaces,
    }),
    [places, current, setCurrent, isPremium, addPlace, updatePlace, removePlace, validateName, restorePlaces, clearPlaces],
  );

  return <PlacesContext.Provider value={value}>{children}</PlacesContext.Provider>;
}

export function usePlaces(): PlacesContextValue {
  const context = useContext(PlacesContext);
  if (!context) throw new Error('usePlaces doit être utilisé dans <PlacesProvider>.');
  return context;
}
