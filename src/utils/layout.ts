import { CONTENT_MAX_WIDTH, TABLET_CONTENT_MAX_WIDTH, spacing } from '@/theme/tokens';

export type LayoutSize = 'compact' | 'medium' | 'expanded';

/** Plus petit côté de l’écran (en points) à partir duquel un appareil Android est une tablette (« sw600dp »). */
export const TABLET_MIN_SHORTEST_SIDE = 600;

/** Largeur à partir de laquelle une tablette affiche deux colonnes côte à côte (iPad à l’horizontale). */
export const TWO_PANE_MIN_WIDTH = 1000;

/** Largeur de la colonne de gauche (résumé, filtres) en mode deux colonnes. */
export const SIDE_PANE_WIDTH = 360;

export interface DeviceInfo {
  os: string;
  /** `Platform.isPad` sur iOS. */
  isPad: boolean;
  /** Dimensions de l’écran entier (pas de la fenêtre, qui rétrécit en Split View). */
  screenWidth: number;
  screenHeight: number;
}

/**
 * Modèle d’appareil : tablette ou téléphone. Sur iOS, le système le dit (iPad) ; sur Android, on suit
 * la règle d’Android : plus petit côté de l’écran d’au moins 600 points. Un iPhone Duo déplié reste
 * un téléphone. Le web n’est jamais traité comme une tablette.
 */
export function isTabletDevice({ os, isPad, screenWidth, screenHeight }: DeviceInfo): boolean {
  if (os === 'ios') return isPad;
  if (os === 'android') return Math.min(screenWidth, screenHeight) >= TABLET_MIN_SHORTEST_SIDE;
  return false;
}

/** Colonnes des grilles (recettes, conseils) selon la largeur utile. */
function gridColumnsFor(size: LayoutSize, innerWidth: number, isTablet: boolean): number {
  if (!isTablet) return size === 'compact' ? 2 : 3;
  return innerWidth >= 900 ? 4 : innerWidth >= 560 ? 3 : 2;
}

/**
 * Mise en page selon la largeur disponible et le modèle d’appareil.
 * - `gutter` / `contentWidth` : colonne de lecture (listes, formulaires), identique sur tous les appareils.
 * - `wideGutter` / `wideContentWidth` : colonne large des grilles et du mode deux colonnes, plus large
 *   sur tablette ; égale à la colonne de lecture sur téléphone.
 * - `twoPane` : tablette assez large (iPad à l’horizontale) pour afficher deux colonnes côte à côte.
 * En Split View, la fenêtre d’une tablette peut être étroite : tout dépend alors de sa largeur.
 */
export function computeLayout(width: number, isTablet: boolean) {
  const size: LayoutSize = width >= 1000 ? 'expanded' : width >= 600 ? 'medium' : 'compact';
  const wideMax = isTablet ? TABLET_CONTENT_MAX_WIDTH : CONTENT_MAX_WIDTH;
  const wideContentWidth = Math.min(width, wideMax + spacing.lg * 2);
  return {
    size,
    width,
    isTablet,
    /** Marge latérale qui centre la colonne de lecture sur grand écran. */
    gutter: Math.max(spacing.lg, (width - CONTENT_MAX_WIDTH) / 2),
    contentWidth: Math.min(width, CONTENT_MAX_WIDTH + spacing.lg * 2),
    /** Marge latérale de la colonne large (grilles, deux colonnes). */
    wideGutter: Math.max(spacing.lg, (width - wideMax) / 2),
    wideContentWidth,
    gridColumns: gridColumnsFor(size, wideContentWidth - spacing.lg * 2, isTablet),
    twoPane: isTablet && width >= TWO_PANE_MIN_WIDTH,
  };
}

export type Layout = ReturnType<typeof computeLayout>;
