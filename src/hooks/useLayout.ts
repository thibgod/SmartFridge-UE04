import { Dimensions, Platform } from 'react-native';
import { useSafeAreaFrame } from 'react-native-safe-area-context';

import { computeLayout, isTabletDevice, type Layout } from '@/utils/layout';

export type { LayoutSize } from '@/utils/layout';

/** Le modèle d’appareil ne change pas pendant que l’app tourne : calculé une seule fois. */
let tabletCache: boolean | undefined;

/** Tablette (iPad, tablette Android) ou téléphone. */
export function isTablet(): boolean {
  if (tabletCache === undefined) {
    const screen = Dimensions.get('screen');
    tabletCache = isTabletDevice({
      os: Platform.OS,
      isPad: Platform.OS === 'ios' && Platform.isPad,
      screenWidth: screen.width,
      screenHeight: screen.height,
    });
  }
  return tabletCache;
}

/**
 * Adaptation téléphone / tablette : largeur de contenu bornée, colonnes des grilles (conseils,
 * recettes) et mode deux colonnes sur tablette à l’horizontale. Voir `computeLayout`.
 */
export function useLayout(): Layout {
  // Zone sûre plutôt que fenêtre : sur l’iPhone Duo, la colonne de l’appareil photo est exclue (voir _layout).
  const { width } = useSafeAreaFrame();
  return computeLayout(width, isTablet());
}
