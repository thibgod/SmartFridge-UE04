import { useIsFocused } from 'expo-router';
import { createContext, useContext, useEffect, useMemo, type PropsWithChildren } from 'react';
import { useAnimatedReaction, useReducedMotion, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';

import { glassSpring, nextTabBarCollapsed } from '@/theme/liquidGlass';

interface TabBarCollapse {
  /** 0 = barre dépliée, 1 = réduite (animé, lu par la barre sur le fil d’interface). */
  progress: SharedValue<number>;
  /** État visé, pour ne relancer le ressort qu’au changement. */
  collapsed: SharedValue<boolean>;
}

const TabBarCollapseContext = createContext<TabBarCollapse | null>(null);

/** Partage l’état de la barre d’onglets entre les écrans (qui défilent) et la barre (qui se réduit). */
export function TabBarCollapseProvider({ children }: PropsWithChildren) {
  const progress = useSharedValue(0);
  const collapsed = useSharedValue(false);
  const value = useMemo(() => ({ progress, collapsed }), [progress, collapsed]);
  return <TabBarCollapseContext.Provider value={value}>{children}</TabBarCollapseContext.Provider>;
}

/** Avancement de la réduction (0 → 1) pour la barre ; 0 hors des onglets. */
export function useTabBarCollapseProgress(): SharedValue<number> | undefined {
  return useContext(TabBarCollapseContext)?.progress;
}

/**
 * À appeler par chaque écran d’onglet avec son défilement : la barre se réduit quand on descend et se
 * déplie quand on remonte, comme sur iOS 26. Calculé image par image sur le fil d’interface ; React
 * n’est pas sollicité. En arrivant sur un onglet, la barre se déplie.
 */
export function useCollapseTabBarOnScroll(scrollY: SharedValue<number>) {
  const context = useContext(TabBarCollapseContext);
  const reducedMotion = useReducedMotion();
  const focused = useIsFocused();

  useEffect(() => {
    if (!context || !focused) return;
    context.collapsed.set(false);
    context.progress.set(reducedMotion ? 0 : withSpring(0, glassSpring.morph));
  }, [context, focused, reducedMotion]);

  useAnimatedReaction(
    () => scrollY.get(),
    (y, previousY) => {
      if (!context || !focused || previousY === null) return;
      const next = nextTabBarCollapsed(y, previousY, context.collapsed.get());
      if (next === context.collapsed.get()) return;
      context.collapsed.set(next);
      context.progress.set(reducedMotion ? (next ? 1 : 0) : withSpring(next ? 1 : 0, glassSpring.morph));
    },
    [context, focused, reducedMotion],
  );
}
