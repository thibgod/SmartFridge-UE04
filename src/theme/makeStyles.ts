import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useTheme, type AppTheme } from './ThemeProvider';

/**
 * Feuilles de style dépendantes du thème, calculées une fois par thème :
 *   const useStyles = makeStyles((t) => ({ card: { backgroundColor: t.colors.surface } }));
 *   const styles = useStyles();
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(factory: (theme: AppTheme) => T) {
  const cache = new WeakMap<AppTheme, T>();
  return function useStyles(): T {
    const theme = useTheme();
    return useMemo(() => {
      const cached = cache.get(theme);
      if (cached) return cached;
      const styles = StyleSheet.create(factory(theme));
      cache.set(theme, styles);
      return styles;
    }, [theme]);
  };
}
