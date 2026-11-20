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

import { TOAST_CLEARANCE } from '@/components/ui/Toast';
import { useToastVisible } from '@/features/feedback/ToastProvider';
import { useLayout } from '@/hooks/useLayout';
import { CHROME_FONT_SCALE, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { IconName } from '@/types/content';

interface FabProps {
  label: string;
  icon: IconName;
  onPress: () => void;
  /** Affiche le libellé à côté de l’icône (en haut de liste) ; replié en simple rond sinon. */
  extended?: boolean;
  /** Masqué en fondu (ex. pendant un balayage) plutôt que retiré d’un coup. */
  visible?: boolean;
}

const HIDE = { duration: 180, easing: Easing.out(Easing.quad) };
// Ressort amorti (sans rebond) : aucun geste n’a lancé le bouton, il se pose simplement.
// Interruptible : s’il repart pendant son retour, il part de sa position à l’écran.
const SHOW = { dampingRatio: 1, duration: 320 };

/** Bouton d’action principal flottant, en bas à droite : à portée de pouce. */
export function Fab({ label, icon, onPress, extended = false, visible = true }: FabProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  // Sur grand écran (iPhone Duo déplié, tablette), le bouton s’aligne sur la colonne de contenu centrée.
  const { gutter } = useLayout();
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
    opacity: Math.min(1, shown.value),
    transform: [{ translateY: (1 - shown.value) * 18 - lift.value }, { scale: 0.6 + 0.4 * shown.value }],
  }));

  return (
    <Animated.View
      layout={LinearTransition.duration(220)}
      pointerEvents={visible ? 'box-none' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      style={[styles.container, { right: gutter }, animated]}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [styles.fab, !extended && styles.compact, pressed && styles.pressed]}
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
      </Pressable>
    </Animated.View>
  );
}

const useStyles = makeStyles(({ colors, shadowStrong }) => ({
  container: { position: 'absolute', bottom: spacing.lg },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 58,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xl - 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    ...shadowStrong,
  },
  compact: { width: 58, paddingLeft: 0, paddingRight: 0, justifyContent: 'center' },
  pressed: { backgroundColor: colors.primaryPressed, transform: [{ scale: 0.96 }] },
  label: { color: colors.onPrimary, fontSize: fontSize.bodyLarge, fontWeight: '800' },
}));
