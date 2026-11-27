import type { Component } from 'react';
import { useAnimatedRef, useScrollOffset } from 'react-native-reanimated';

import { useGlassContentTop, useGlassHeaderInset } from './GlassHeader';
import { useGlassTabBarInset } from './GlassTabBar';
import { useCollapseTabBarOnScroll } from './TabBarCollapse';

/**
 * Tout ce qu’il faut à un écran d’onglet en verre, en un appel :
 *   const { ref, scrollY, contentInsets, indicatorInsets } = useGlassScroll<Animated.ScrollView>();
 *   <Animated.ScrollView ref={ref} contentContainerStyle={[contentInsets, …]} scrollIndicatorInsets={indicatorInsets} />
 *   <GlassHeader scrollY={scrollY} … />
 * (Déstructurer le résultat : le lint refuse de lire une propriété d’un objet qui contient une référence.)
 * Le contenu passe sous l’en-tête et la barre d’onglets (marges réservées), et la barre se réduit au défilement.
 */
export function useGlassScroll<T extends Component<any>>(extraBottom = 0) {
  const ref = useAnimatedRef<T>();
  const scrollY = useScrollOffset(ref);
  const headerInset = useGlassHeaderInset();
  const contentTop = useGlassContentTop();
  const tabBarInset = useGlassTabBarInset();
  useCollapseTabBarOnScroll(scrollY);
  return {
    ref,
    scrollY,
    contentInsets: { paddingTop: contentTop, paddingBottom: tabBarInset + extraBottom },
    indicatorInsets: { top: headerInset, bottom: tabBarInset },
  };
}
