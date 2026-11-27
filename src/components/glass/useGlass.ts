import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useMemo, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

import { useTheme } from '@/theme';
import { glassPalette, resolveGlassMode, type GlassMode, type GlassPalette } from '@/theme/liquidGlass';

/** Vérifié une seule fois : certaines bêtas d’iOS 26 annoncent le matériau sans l’API et plantent. */
const LIQUID_GLASS = (() => {
  if (Platform.OS !== 'ios') return false;
  try {
    return isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  } catch {
    return false;
  }
})();

/**
 * Réglage « Réduire la transparence » (iOS ; toujours faux ailleurs). Un seul abonnement pour toute
 * l’app, quel que soit le nombre de surfaces en verre affichées.
 */
let reduceTransparency = false;
const listeners = new Set<() => void>();
let subscribed = false;

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!subscribed && Platform.OS === 'ios') {
    subscribed = true;
    const update = (value: boolean) => {
      if (value === reduceTransparency) return;
      reduceTransparency = value;
      listeners.forEach((notify) => notify());
    };
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then(update)
      .catch(() => undefined);
    AccessibilityInfo.addEventListener('reduceTransparencyChanged', update);
  }
  return () => listeners.delete(listener);
}

function useReduceTransparency(): boolean {
  return useSyncExternalStore(subscribe, () => reduceTransparency);
}

export interface GlassContext {
  mode: GlassMode;
  glass: GlassPalette;
  isDark: boolean;
}

/** Rendu du verre adapté à l’appareil et au thème, partagé par tous les composants `Glass*`. */
export function useGlass(): GlassContext {
  const { colors, isDark } = useTheme();
  const reduceTransparency = useReduceTransparency();
  const mode = resolveGlassMode({ os: Platform.OS, liquidGlassAvailable: LIQUID_GLASS, reduceTransparency });
  const glass = useMemo(() => glassPalette(colors, isDark), [colors, isDark]);
  return { mode, glass, isDark };
}
