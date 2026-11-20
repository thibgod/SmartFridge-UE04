import { Platform, type ViewStyle } from 'react-native';

/**
 * Jetons de design. Les couleurs existent en deux variantes (clair / sombre) avec les mêmes clés :
 * les composants ne référencent jamais une couleur en dur, seulement un rôle.
 */

export interface Palette {
  background: string;
  surface: string;
  surfaceRaised: string;
  surfaceMuted: string;
  border: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  primary: string;
  primaryPressed: string;
  primarySoft: string;
  onPrimary: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  success: string;
  successSoft: string;
  info: string;
  infoSoft: string;
  /** Paire catégorielle des graphiques, validée pour le daltonisme (le vert / rouge échoue en deutéranopie). */
  chartConsumed: string;
  chartDiscarded: string;
  chartGrid: string;
  /** Voile appliqué sur les photos pour garantir la lisibilité du texte posé dessus. */
  scrim: string;
  tabBar: string;
  toast: string;
  onToast: string;
  toastAccent: string;
  toastDanger: string;
}

export const lightPalette: Palette = {
  background: '#F6F4EE',
  surface: '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceMuted: '#EFECE3',
  border: '#E4DFD2',
  text: '#17211B',
  textMuted: '#56615A',
  textSubtle: '#6F7A73',
  primary: '#2F6B4F',
  primaryPressed: '#245540',
  primarySoft: '#E2EEE6',
  onPrimary: '#FFFFFF',
  danger: '#B3261E',
  dangerSoft: '#FBE6E3',
  warning: '#9C4A00',
  warningSoft: '#FDEBD3',
  success: '#2E7D32',
  successSoft: '#E1F1E2',
  info: '#2B5F8A',
  infoSoft: '#E2EDF6',
  chartConsumed: '#2B6CB0',
  chartDiscarded: '#CF6A2E',
  chartGrid: '#E9E3D5',
  scrim: 'rgba(10, 16, 12, 0.62)',
  tabBar: '#FFFFFF',
  toast: '#24302A',
  onToast: '#FFFFFF',
  toastAccent: '#A8E0B8',
  toastDanger: '#FFB4AB',
};

export const darkPalette: Palette = {
  background: '#0E1411',
  surface: '#161E1A',
  surfaceRaised: '#1D2621',
  surfaceMuted: '#222C27',
  border: '#2C3832',
  text: '#E9EFEA',
  textMuted: '#A9B5AD',
  textSubtle: '#8A978F',
  primary: '#72C79F',
  primaryPressed: '#5FB58C',
  primarySoft: '#1C3529',
  onPrimary: '#0A1D13',
  danger: '#FF9A8F',
  dangerSoft: '#3A1E1B',
  warning: '#FFBE75',
  warningSoft: '#3A2B16',
  success: '#86D896',
  successSoft: '#1B3222',
  info: '#93C6F0',
  infoSoft: '#1A2C3B',
  chartConsumed: '#4F8FD6',
  chartDiscarded: '#D9773F',
  chartGrid: '#26302B',
  scrim: 'rgba(0, 0, 0, 0.6)',
  tabBar: '#121915',
  toast: '#E9EFEA',
  onToast: '#0E1411',
  toastAccent: '#2F6B4F',
  toastDanger: '#B3261E',
};

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 28,
  pill: 999,
} as const;

export const fontSize = {
  micro: 11,
  caption: 13,
  body: 15,
  bodyLarge: 17,
  title: 20,
  heading: 26,
  display: 32,
} as const;

/**
 * Agrandissement maximal du texte des éléments d’interface compacts (pastilles, compteurs, bouton
 * flottant) quand l’utilisateur choisit un très grand texte : le texte courant, lui, grandit librement.
 */
export const CHROME_FONT_SCALE = 1.3;

/** Très grands titres (26 pt et plus) : au-delà, un mot long ne tiendrait plus sur la largeur de l’écran. */
export const HEADING_FONT_SCALE = 1.5;

/**
 * Retour visuel dès que le doigt se pose (et non au relâchement) pour les éléments touchables
 * qui n’ont pas de style d’appui propre : liens, coches, petits boutons d’icône.
 */
export const PRESSED: ViewStyle = { opacity: 0.55 };

/** Taille minimale recommandée des zones tactiles (Apple HIG / Material). */
export const MIN_TOUCH = 44;

/** Largeur de lecture maximale sur tablette / grand écran. */
export const CONTENT_MAX_WIDTH = 760;

export function elevation(isDark: boolean, level: 1 | 2 = 1): ViewStyle {
  // En mode sombre, les ombres sont invisibles : la hiérarchie passe par la surface plus claire.
  if (isDark) return {};
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#3B3220',
      shadowOpacity: level === 1 ? 0.07 : 0.14,
      shadowRadius: level === 1 ? 10 : 18,
      shadowOffset: { width: 0, height: level === 1 ? 3 : 8 },
    },
    default: { elevation: level === 1 ? 2 : 6 },
  });
}
