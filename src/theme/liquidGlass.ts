import type { Palette } from './tokens';

/**
 * Design system « Liquid Glass » : jetons purs (sans React ni module natif), testables.
 *
 * Quatre rendus selon l’appareil, choisis par `resolveGlassMode` :
 * - `native` : iOS 26 et plus, vrai matériau Liquid Glass du système (expo-glass-effect) ;
 * - `blur`   : iOS plus ancien et web, flou natif (expo-blur) + reflets dessinés ;
 * - `tinted` : Android, verre « dépoli » simulé (voile semi-opaque, reflet, liseré lumineux, ombre
 *              colorée). Pas de flou en temps réel : il coûte cher, demande d’envelopper chaque
 *              écran et donne un fond gris sur beaucoup d’appareils ;
 * - `opaque` : « Réduire la transparence » activé, surface pleine et lisible.
 */

export type GlassMode = 'native' | 'blur' | 'tinted' | 'opaque';

export interface GlassEnvironment {
  os: 'ios' | 'android' | 'web' | (string & {});
  /** API Liquid Glass présente et utilisable (iOS 26+, app compilée avec le SDK iOS 26+). */
  liquidGlassAvailable: boolean;
  /** Réglage d’accessibilité « Réduire la transparence ». */
  reduceTransparency: boolean;
}

export function resolveGlassMode({ os, liquidGlassAvailable, reduceTransparency }: GlassEnvironment): GlassMode {
  if (reduceTransparency) return 'opaque';
  if (os === 'ios') return liquidGlassAvailable ? 'native' : 'blur';
  if (os === 'web') return 'blur';
  return 'tinted';
}

/**
 * Épaisseur du verre, du plus léger au plus couvrant :
 * - `clear`   : décor, pastilles sur photo (pas de texte long dessus) ;
 * - `regular` : cartes, boutons ;
 * - `thick`   : barres (onglets, en-tête), feuilles : le texte y reste lisible sur n’importe quel fond.
 */
export type GlassMaterial = 'clear' | 'regular' | 'thick';

export const GLASS_MATERIALS: Record<
  GlassMaterial,
  {
    /** Style du matériau système (iOS 26). */
    nativeStyle: 'clear' | 'regular';
    /** Force du flou expo-blur (1 à 100). */
    blurIntensity: number;
    /** Opacité du voile posé sur le flou (iOS < 26) puis du voile seul (Android). */
    veil: { blur: { light: number; dark: number }; tinted: { light: number; dark: number } };
  }
> = {
  clear: {
    nativeStyle: 'clear',
    blurIntensity: 30,
    veil: { blur: { light: 0.12, dark: 0.18 }, tinted: { light: 0.42, dark: 0.5 } },
  },
  regular: {
    nativeStyle: 'regular',
    blurIntensity: 55,
    veil: { blur: { light: 0.4, dark: 0.45 }, tinted: { light: 0.86, dark: 0.84 } },
  },
  thick: {
    nativeStyle: 'regular',
    blurIntensity: 80,
    veil: { blur: { light: 0.55, dark: 0.6 }, tinted: { light: 0.88, dark: 0.9 } },
  },
};

/** Rayons de courbure : grands et continus, comme les coins des écrans récents. */
export const glassRadius = {
  control: 22,
  card: 26,
  bar: 32,
  sheet: 34,
  pill: 999,
} as const;

/**
 * Coins concentriques : un élément posé dans un conteneur arrondi garde un écart constant avec son
 * bord (rayon intérieur = rayon extérieur − marge), sinon l’œil voit un coin « qui bave ».
 */
export function concentricRadius(outer: number, inset: number, min = 6): number {
  return Math.max(min, outer - inset);
}

/** Ressorts (Reanimated `withSpring`). Interruptibles : un nouvel appui repart de la position affichée. */
export const glassSpring = {
  /** Appui : rapide, sans rebond à l’enfoncement. */
  press: { damping: 20, stiffness: 520, mass: 0.6 },
  /** Relâchement : léger rebond élastique. */
  release: { damping: 12, stiffness: 320, mass: 0.6 },
  /** Changement de forme ou de position (pastille d’onglet, en-tête). */
  morph: { damping: 18, stiffness: 240, mass: 0.8 },
} as const;

export const GLASS_PRESS_SCALE = 0.96;

/** Durée d’apparition du verre (en-tête au défilement), en millisecondes. */
export const GLASS_FADE_MS = 220;

/** Opacité du voile d’un verre proéminent (bouton principal, action destructive) sur Android. */
export const PROMINENT_VEIL = 0.92;

/**
 * Intensité des trois halos du fond d’ambiance (accent, froid, chaud). Ils utilisent les teintes douces du
 * thème (`primarySoft`…), de même luminosité que le fond : beaucoup de couleur, sans perte de contraste.
 * Bornée par un test : même là où les halos se superposent, le texte secondaire garde 4,5:1.
 */
/** Pastels des halos en mode clair (et part de l’accent mêlée à sa teinte douce). */
export const LIGHT_GLOW = { accentMix: 0.14, sky: '#CFE2F8', peach: '#FCDDC2' } as const;

export const BACKDROP_GLOW = {
  light: [0.95, 0.85, 0.7],
  dark: [0.95, 0.85, 0.6],
} as const;

/**
 * Barre d’onglets : hauteur dépliée, hauteur réduite au défilement (libellés masqués), et défilement
 * minimal (pt) avant de la réduire, pour ne pas la faire clignoter au moindre mouvement.
 */
export const TAB_BAR = { height: 64, compactHeight: 50, collapseAfter: 80, directionSlop: 6 } as const;

/**
 * Écart entre la barre d’onglets et le bas de l’écran : posée au niveau de l’indicateur d’accueil (elle
 * le chevauche un peu, comme les barres d’iOS 26 et plus), jamais collée au bord sur un écran sans encoche.
 */
export function tabBarBottomGap(safeAreaBottom: number): number {
  return Math.max(safeAreaBottom - 14, 12);
}

/** « #RRGGBB » → « rgba(r, g, b, a) ». */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 1000) / 1000})`;
}

/** Couleur obtenue en posant `hex` à l’opacité `alpha` sur `background` (« #RRGGBB »). */
export function compositeOver(hex: string, alpha: number, background: string): string {
  const channel = (color: string, i: number) => parseInt(color.replace('#', '').slice(i, i + 2), 16);
  return (
    '#' +
    [0, 2, 4]
      .map((i) => Math.round(channel(hex, i) * alpha + channel(background, i) * (1 - alpha)))
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

export interface GlassPalette {
  /** Couleur de base du voile (blanc en clair, surface sombre en sombre). */
  veilBase: string;
  /** Liseré spéculaire : bord haut-gauche (lumière) et bas-droit (ombre propre). */
  rimLight: string;
  rimShade: string;
  /** Reflet doux sur le haut de la surface (dégradé vertical). */
  sheen: readonly [string, string];
  /** Ombre portée, teintée par l’accent (couleur « réfléchie » du contenu). */
  shadow: string;
  shadowStrong: string;
  /** Verre « proéminent » (bouton principal) : teinte d’accent. */
  prominentTint: string;
  /** Teinte du verre épais (barres) sur iOS 26 : atténue le contenu dessous pour que les libellés restent lisibles. */
  barTint: string;
  /** Pastille du choix actif posée sur du verre (contrôle segmenté) et son ombre. */
  lens: string;
  lensShadow: string | undefined;
  /** Capsule de l’onglet actif (barre du bas) : verre gris clair, sans teinte, comme Apple Music. */
  tabLens: string;
  prominentVeil: string;
  /** Fond d’ambiance des écrans, que le verre réfracte. */
  backdrop: readonly [string, string, string];
  /** Halos du fond : accent (haut gauche), froid (droite), chaud (bas). */
  backdropGlow: readonly [string, string, string];
  /** Fondu sous l’en-tête en verre : le contenu s’y efface au lieu d’être coupé net. */
  edgeFade: string;
}

export function glassPalette(colors: Palette, isDark: boolean): GlassPalette {
  const glowColors = backdropGlowColors(colors, isDark);
  const glowAlpha = isDark ? BACKDROP_GLOW.dark : BACKDROP_GLOW.light;
  return {
    veilBase: isDark ? colors.surface : '#FFFFFF',
    rimLight: isDark ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.9)',
    rimShade: isDark ? 'rgba(255, 255, 255, 0.05)' : withAlpha(colors.text, 0.08),
    sheen: isDark
      ? ['rgba(255, 255, 255, 0.10)', 'rgba(255, 255, 255, 0)']
      : ['rgba(255, 255, 255, 0.55)', 'rgba(255, 255, 255, 0)'],
    shadow: isDark
      ? `0 6px 18px ${withAlpha('#000000', 0.45)}`
      : `0 1px 2px ${withAlpha(colors.text, 0.06)}, 0 8px 24px ${withAlpha(colors.primary, 0.12)}`,
    shadowStrong: isDark
      ? `0 12px 32px ${withAlpha('#000000', 0.55)}`
      : `0 2px 4px ${withAlpha(colors.text, 0.08)}, 0 16px 40px ${withAlpha(colors.primary, 0.2)}`,
    prominentTint: colors.primary,
    barTint: withAlpha(isDark ? colors.surface : '#FFFFFF', isDark ? 0.55 : 0.32),
    lens: isDark ? 'rgba(255, 255, 255, 0.14)' : 'rgba(255, 255, 255, 0.9)',
    lensShadow: isDark ? undefined : `0 1px 4px ${withAlpha(colors.text, 0.12)}`,
    tabLens: isDark ? 'rgba(255, 255, 255, 0.13)' : withAlpha(colors.text, 0.07),
    prominentVeil: withAlpha(colors.primary, PROMINENT_VEIL),
    backdrop: [colors.background, colors.background, colors.background],
    backdropGlow: [
      withAlpha(glowColors[0], glowAlpha[0]),
      withAlpha(glowColors[1], glowAlpha[1]),
      withAlpha(glowColors[2], glowAlpha[2]),
    ],
    edgeFade: withAlpha(colors.background, 0.7),
  };
}

/** Couleur pleine équivalente au voile d’un matériau, posé sur `background` (pour vérifier le contraste). */
export function veilColor(colors: Palette, isDark: boolean, material: GlassMaterial, background: string): string {
  const alpha = GLASS_MATERIALS[material].veil.tinted[isDark ? 'dark' : 'light'];
  return compositeOver(glassPalette(colors, isDark).veilBase, alpha, background);
}

/**
 * Pire couleur du fond d’ambiance : les trois halos superposés à pleine intensité sur la couleur de
 * fond (en vrai, ils s’estompent et se chevauchent peu). Sert à vérifier la lisibilité du texte posé dessus.
 */
export function backdropWorstColor(colors: Palette, isDark: boolean): string {
  const [accent, cool, warm] = isDark ? BACKDROP_GLOW.dark : BACKDROP_GLOW.light;
  const [accentColor, coolColor, warmColor] = backdropGlowColors(colors, isDark);
  return compositeOver(warmColor, warm, compositeOver(coolColor, cool, compositeOver(accentColor, accent, colors.background)));
}

/**
 * Couleurs pleines des trois halos. En sombre : les teintes douces du thème. En clair : des pastels plus
 * francs (accent plus soutenu, bleu ciel, pêche) pour que le mode clair ait autant de relief que le
 * sombre, tout en restant assez clairs pour le texte gris (vérifié par `backdropWorstColor`).
 */
export function backdropGlowColors(colors: Palette, isDark: boolean): readonly [string, string, string] {
  if (isDark) return [colors.primarySoft, colors.infoSoft, colors.warningSoft];
  return [compositeOver(colors.primary, LIGHT_GLOW.accentMix, colors.primarySoft), LIGHT_GLOW.sky, LIGHT_GLOW.peach];
}

/**
 * Réduction de la barre d’onglets selon le défilement (pure, appelée image par image) : on la réduit en
 * descendant au-delà de `collapseAfter`, on la déplie en remontant ou près du haut de la page.
 * Renvoie l’état précédent quand le mouvement est trop petit pour décider.
 */
export function nextTabBarCollapsed(y: number, previousY: number, collapsed: boolean): boolean {
  'worklet';
  if (y <= TAB_BAR.collapseAfter) return false;
  const delta = y - previousY;
  if (delta > TAB_BAR.directionSlop) return true;
  if (delta < -TAB_BAR.directionSlop) return false;
  return collapsed;
}

/**
 * Choix sous le doigt pendant qu’on glisse sur une barre en verre : position continue de la pastille
 * (centrée sous le doigt, bornée aux extrémités) et index arrondi. `x` est mesuré dans le conteneur.
 */
export function lensIndexAt(x: number, itemWidth: number, inset: number, count: number): { continuous: number; index: number } {
  'worklet';
  if (itemWidth <= 0 || count <= 0) return { continuous: 0, index: 0 };
  const continuous = Math.min(count - 1, Math.max(0, (x - inset) / itemWidth - 0.5));
  return { continuous, index: Math.round(continuous) };
}
