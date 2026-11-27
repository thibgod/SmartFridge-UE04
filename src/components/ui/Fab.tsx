import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { GlassSurface, useGlassTabBarInset } from '@/components/glass';
import { TOAST_CLEARANCE } from '@/components/ui/Toast';
import { useToastVisible } from '@/features/feedback/ToastProvider';
import { useLayout } from '@/hooks/useLayout';
import { CHROME_FONT_SCALE, fontSize, makeStyles, spacing, useTheme } from '@/theme';
import { glassRadius } from '@/theme/liquidGlass';
import type { IconName } from '@/types/content';

interface FabProps {
  label: string;
  icon: IconName;
  onPress: () => void;
  /** Affiche le libellé à côté de l’icône (en haut de liste) ; replié en simple rond sinon. */
  extended?: boolean;
  /** Masqué en fondu (ex. pendant un balayage) plutôt que retiré d’un coup. */
  visible?: boolean;
  /** Aligné sur la colonne large (écran en deux colonnes sur tablette) plutôt que sur la colonne de lecture. */
  wide?: boolean;
}

const HIDE = { duration: 180, easing: Easing.out(Easing.quad) };
// Ressort amorti (sans rebond) : aucun geste n’a lancé le bouton, il se pose simplement.
// Interruptible : s’il repart pendant son retour, il part de sa position à l’écran.
const SHOW = { dampingRatio: 1, duration: 320 };

/** Bouton d’action principal flottant, en bas à droite : à portée de pouce. */
export function Fab({ label, icon, onPress, extended = false, visible = true, wide = false }: FabProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  // Sur grand écran (iPhone Duo déplié, tablette), le bouton s’aligne sur la colonne de contenu centrée.
  const layout = useLayout();
  const gutter = wide ? layout.wideGutter : layout.gutter;
  // Posé au-dessus de la barre d’onglets flottante, que le contenu traverse.
  const tabBarInset = useGlassTabBarInset();
  const shown = useSharedValue(visible ? 1 : 0);
  // Un toast (« Annuler ») s’affiche au même endroit : le bouton monte au-dessus au lieu d’être caché.
  const toastVisible = useToastVisible();
  const lift = useSharedValue(0);

  useEffect(() => {
    shown.value = visible ? withSpring(1, SHOW) : withTiming(0, HIDE);
  }, [visible, shown]);

  useEffect(() => {
    lift.value = withTiming(toastVisible ? TOAST_CLEARANCE : 0, { duration: 240, easing: Easing.out(Easing.cubic) });
  }, [toastVisible, lift]);

  const animated = useAnimatedStyle(() => ({
    // Jamais exactement 0 : un verre iOS 26 dont un parent passe à opacité 0 ne se redessine plus à son
    // retour (limite d’expo-glass-effect). À 0,01 il reste invisible ; `pointerEvents` coupe le toucher.
    opacity: Math.max(0.01, Math.min(1, shown.value)),
    transform: [{ translateY: (1 - shown.value) * 18 - lift.value }, { scale: 0.6 + 0.4 * shown.value }],
  }));

  return (
    <Animated.View
      layout={LinearTransition.duration(220)}
      pointerEvents={visible ? 'box-none' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      style={[styles.container, { right: gutter, bottom: tabBarInset + spacing.xs }, animated]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => pressed && styles.pressed}
      >
        {/* Verre teinté par l’accent : le bouton principal se détache du contenu qui défile dessous. */}
        <GlassSurface
          prominent
          interactive
          material="regular"
          radius={glassRadius.pill}
          elevation="high"
          style={[styles.fab, !extended && styles.compact]}
        >
          <Ionicons name={icon} size={26} color={colors.onPrimary} />
          {extended ? (
            <Animated.Text
              entering={FadeIn.duration(180).delay(60)}
              exiting={FadeOut.duration(100)}
              style={styles.label}
              numberOfLines={1}
              maxFontSizeMultiplier={CHROME_FONT_SCALE}
            >
              {label}
            </Animated.Text>
          ) : null}
        </GlassSurface>
      </Pressable>
    </Animated.View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  container: { position: 'absolute' },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 58,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xl - 2,
  },
  compact: { width: 58, paddingLeft: 0, paddingRight: 0, justifyContent: 'center' },
  pressed: { transform: [{ scale: 0.96 }] },
  label: { color: colors.onPrimary, fontSize: fontSize.bodyLarge, fontWeight: '800' },
}));
