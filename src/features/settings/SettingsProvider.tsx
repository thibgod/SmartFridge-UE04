import { useSQLiteContext } from 'expo-sqlite';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { createSettingsRepository } from '@/repositories/settingsRepository';
import { DEFAULT_SETTINGS, type AppSettings } from '@/types/settings';

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Réglages persistés en base. Les enfants ne sont rendus qu’une fois les réglages lus. */
export function SettingsProvider({ children }: PropsWithChildren) {
  const db = useSQLiteContext();
  const repository = useMemo(() => createSettingsRepository(db), [db]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    let active = true;
    repository
      .load()
      .then((loaded) => active && setSettings(loaded))
      .catch((error: unknown) => {
        console.warn('[SmartFridge] Réglages illisibles, valeurs par défaut utilisées', error);
        if (active) setSettings(DEFAULT_SETTINGS);
      });
    return () => {
      active = false;
    };
  }, [repository]);

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      setSettings((prev) => ({ ...(prev ?? DEFAULT_SETTINGS), ...patch }));
      await repository.save(patch);
    },
    [repository],
  );

  const value = useMemo(
    () => (settings ? { settings, updateSettings } : null),
    [settings, updateSettings],
  );

  if (!value) return null;
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings doit être utilisé dans <SettingsProvider>.');
  return context;
}
