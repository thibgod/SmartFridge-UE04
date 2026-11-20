import { Platform } from 'react-native';

import type { AccentId } from '@/theme/accents';

/**
 * Icônes d’app alternatives (Premium), une par couleur d’accent. « Forêt » est l’icône d’origine.
 * Les noms natifs sont déclarés dans app.json (plugin expo-alternate-app-icons).
 */
export type AppIconId = AccentId;

const NATIVE_NAMES: Record<Exclude<AppIconId, 'foret'>, string> = {
  ocean: 'Ocean',
  framboise: 'Framboise',
  prune: 'Prune',
  terracotta: 'Terracotta',
};

type IconModule = typeof import('expo-alternate-app-icons');

/** Module natif absent sur le web et dans Expo Go : la fonction est alors simplement masquée. */
function loadModule(): IconModule | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('expo-alternate-app-icons') as IconModule;
    return module.supportsAlternateIcons ? module : null;
  } catch {
    return null;
  }
}

const iconModule = loadModule();

export const supportsAppIcons = iconModule !== null;

export function currentAppIcon(): AppIconId {
  const name = iconModule?.getAppIconName() ?? null;
  const entry = Object.entries(NATIVE_NAMES).find(([, native]) => native === name);
  return (entry?.[0] as AppIconId | undefined) ?? 'foret';
}

/** Change l’icône de l’app ; iOS affiche lui-même une petite alerte de confirmation. */
export async function setAppIcon(icon: AppIconId): Promise<void> {
  if (!iconModule) return;
  if (icon === 'foret') await iconModule.resetAppIcon();
  else await iconModule.setAlternateAppIcon(NATIVE_NAMES[icon] as Parameters<IconModule['setAlternateAppIcon']>[0]);
}
