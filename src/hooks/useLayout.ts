import { useSafeAreaFrame } from 'react-native-safe-area-context';

import { CONTENT_MAX_WIDTH, spacing } from '@/theme';

export type LayoutSize = 'compact' | 'medium' | 'expanded';

/**
 * Adaptation téléphone / tablette : largeur de contenu bornée et nombre de colonnes
 * pour les grilles (conseils, recettes).
 */
export function useLayout() {
  // Zone sûre plutôt que fenêtre : sur l’iPhone Duo, la colonne de l’appareil photo est exclue (voir _layout).
  const { width } = useSafeAreaFrame();
  const size: LayoutSize = width >= 1000 ? 'expanded' : width >= 600 ? 'medium' : 'compact';
  const contentWidth = Math.min(width, CONTENT_MAX_WIDTH + spacing.lg * 2);
  return {
    size,
    width,
    /** Marge latérale qui centre le contenu sur grand écran. */
    gutter: Math.max(spacing.lg, (width - CONTENT_MAX_WIDTH) / 2),
    contentWidth,
    gridColumns: size === 'compact' ? 2 : size === 'medium' ? 3 : 4,
  };
}
