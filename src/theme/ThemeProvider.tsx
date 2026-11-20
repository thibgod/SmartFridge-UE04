import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';

import type { ThemePreference } from '@/types/settings';

import { applyAccent, DEFAULT_ACCENT, type AccentId } from './accents';
import { darkPalette, elevation, lightPalette, type Palette } from './tokens';

export interface AppTheme {
  colors: Palette;
  isDark: boolean;
  /** Ombre adaptée au thème (aucune en sombre). */
  shadow: ReturnType<typeof elevation>;
  shadowStrong: ReturnType<typeof elevation>;
}

const ThemeContext = createContext<AppTheme | null>(null);

export function buildTheme(isDark: boolean, accent: AccentId = DEFAULT_ACCENT): AppTheme {
  return {
    colors: applyAccent(isDark ? darkPalette : lightPalette, accent, isDark),
    isDark,
    shadow: elevation(isDark, 1),
    shadowStrong: elevation(isDark, 2),
  };
}

/** Thème de l’app + thème de navigation (en-têtes, fonds d’écran, barre d’onglets) cohérents. */
export function AppThemeProvider({
  preference,
  accent = DEFAULT_ACCENT,
  children,
}: PropsWithChildren<{ preference: ThemePreference; accent?: AccentId }>) {
  const systemScheme = useColorScheme();
  const isDark = preference === 'dark' || (preference === 'system' && systemScheme === 'dark');
  const theme = useMemo(() => buildTheme(isDark, accent), [isDark, accent]);

  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.background,
        text: theme.colors.text,
        border: theme.colors.border,
      },
    };
  }, [isDark, theme]);

  return (
    <ThemeContext.Provider value={theme}>
      <NavigationThemeProvider value={navigationTheme}>{children}</NavigationThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): AppTheme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme doit être utilisé dans <AppThemeProvider>.');
  return theme;
}
