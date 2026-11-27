import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useLayout } from '@/hooks/useLayout';
import { CHROME_FONT_SCALE, CONTENT_MAX_WIDTH, fontSize, makeStyles, spacing, TABLET_CONTENT_MAX_WIDTH } from '@/theme';

import { GlassSurface } from './GlassSurface';
import { useGlass } from './useGlass';

/** Hauteur de la barre, hors encoche / Dynamic Island. */
export const GLASS_HEADER_BAR_HEIGHT = 52;

/** Bas de la barre en verre (sous l’encoche) : là où le contenu commence à passer dessous. */
export function useGlassHeaderInset(): number {
  return useSafeAreaInsets().top + GLASS_HEADER_BAR_HEIGHT;
}

/**
 * Haut du contenu défilant : juste sous la barre d’état, pas sous la barre en verre. Le grand titre
 * partage ainsi la ligne des boutons flottants (au lieu de laisser un vide au-dessus) ; l’écran réserve
 * leur largeur avec `GlassHeaderSpacer` pour que le titre ne passe pas dessous.
 */
export function useGlassContentTop(): number {
  return useSafeAreaInsets().top + spacing.xs;
}

/** Taille d’un bouton d’en-tête (`GlassButton iconOnly`) et écart entre deux boutons. */
const HEADER_BUTTON = 48;

/** Place réservée, à droite du grand titre, aux `count` boutons flottants de l’en-tête. */
export function GlassHeaderSpacer({ count }: { count: number }) {
  return <View style={{ width: count * HEADER_BUTTON + (count - 1) * spacing.sm, height: HEADER_BUTTON }} />;
}

interface GlassHeaderProps {
  /** Titre compact, qui apparaît quand le grand titre de l’écran est passé sous la barre. */
  title: string;
  left?: ReactNode;
  right?: ReactNode;
  /** Défilement de l’écran (`useScrollOffset` / `useAnimatedScrollHandler`). Sans lui, la barre est toujours en verre. */
  scrollY?: SharedValue<number>;
  /** Défilement (pt) à partir duquel le verre apparaît et le titre compact se montre. */
  threshold?: number;
  /** Haut de la barre : la zone sûre par défaut ; dans une feuille modale, sa propre marge (`useModalTopInset`). */
  topInset?: number;
  /** Tablette en deux colonnes : boutons alignés sur la colonne large (et non sur la colonne de lecture). */
  wide?: boolean;
}

/**
 * En-tête flottant : transparent en haut de page, il se change en verre dès que le contenu passe
 * dessous (morphing animé du matériau sur iOS 26, fondu ailleurs). Les boutons `left` / `right`
 * sont idéalement des `GlassButton iconOnly`, qui restent lisibles dans les deux états.
 */
export function GlassHeader({ title, left, right, scrollY, threshold = 24, topInset, wide = false }: GlassHeaderProps) {
  const styles = useStyles();
  const safeTop = useSafeAreaInsets().top;
  const top = topInset ?? safeTop;
  // Marges calculées sur la largeur de la barre elle-même, pas sur celle de l’écran : dans une feuille
  // sur iPad (plus étroite que l’écran), les boutons s’alignent sur le contenu de la feuille.
  const layout = useLayout();
  const [barWidth, setBarWidth] = useState<number | null>(null);
  const maxWidth = wide ? TABLET_CONTENT_MAX_WIDTH : CONTENT_MAX_WIDTH;
  const gutter = barWidth === null ? (wide ? layout.wideGutter : layout.gutter) : Math.max(spacing.lg, (barWidth - maxWidth) / 2);
  const { glass } = useGlass();
  const [scrolled, setScrolled] = useState(!scrollY);

  // Le matériau change d’état sur le fil JS (une seule fois par franchissement du seuil, pas à chaque image).
  useAnimatedReaction(
    () => (scrollY ? scrollY.value > threshold : true),
    (now, previous) => {
      if (now !== previous) scheduleOnRN(setScrolled, now);
    },
    [scrollY, threshold],
  );

  // Le titre suit le doigt image par image, sur le fil d’interface.
  const titleStyle = useAnimatedStyle(() => {
    const progress = scrollY ? interpolate(scrollY.value, [threshold, threshold + 24], [0, 1], Extrapolation.CLAMP) : 1;
    return { opacity: progress, transform: [{ translateY: (1 - progress) * 6 }] };
  });
  const edgeStyle = useAnimatedStyle(() => ({
    opacity: scrollY ? interpolate(scrollY.value, [threshold - 8, threshold + 16], [0, 1], Extrapolation.CLAMP) : 1,
  }));

  return (
    <View pointerEvents="box-none" style={styles.container} onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}>
      <GlassSurfaceBar active={scrolled} />
      <View
        pointerEvents="box-none"
        style={[styles.bar, { paddingTop: top, paddingHorizontal: gutter, height: top + GLASS_HEADER_BAR_HEIGHT }]}
      >
        <View style={styles.side}>{left}</View>
        <Animated.View style={[styles.titleBox, titleStyle]} pointerEvents="none">
          <Text style={styles.title} numberOfLines={1} accessibilityRole="header" maxFontSizeMultiplier={CHROME_FONT_SCALE}>
            {title}
          </Text>
        </Animated.View>
        <View style={[styles.side, styles.sideRight]}>{right}</View>
      </View>
      {/* Bord doux sous la barre : le contenu s’y efface au lieu d’être coupé par une ligne nette. */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.edge,
          { experimental_backgroundImage: `linear-gradient(180deg, ${glass.edgeFade} 0%, rgba(0, 0, 0, 0) 100%)` },
          edgeStyle,
        ]}
      />
    </View>
  );
}

/** Fond de la barre : verre épais bord à bord, sans coins ni ombre (il se fond dans la barre d’état). */
function GlassSurfaceBar({ active }: { active: boolean }) {
  const styles = useStyles();
  return <GlassSurface material="thick" radius={0} elevation="none" active={active} style={styles.background} />;
}

const useStyles = makeStyles(({ colors }) => ({
  container: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  background: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  edge: { position: 'absolute', left: 0, right: 0, top: '100%', height: 18 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  side: { minWidth: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sideRight: { justifyContent: 'flex-end' },
  titleBox: { flex: 1, alignItems: 'center' },
  title: { fontSize: fontSize.bodyLarge, fontWeight: '700', letterSpacing: -0.2, color: colors.text },
}));
