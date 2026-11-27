import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { CHROME_FONT_SCALE, fontSize, makeStyles, MIN_TOUCH, spacing, useTheme } from '@/theme';
import { GLASS_PRESS_SCALE, glassRadius, glassSpring } from '@/theme/liquidGlass';
import type { IconName } from '@/types/content';

import { GlassSurface } from './GlassSurface';
import { useGlass } from './useGlass';

/** `danger` : verre neutre, texte rouge (action secondaire). `destructive` : verre teinté rouge (action principale). */
type Variant = 'glass' | 'prominent' | 'danger' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface GlassButtonProps {
  /** Texte du bouton ; pour un bouton icône seule, sert de libellé d’accessibilité. */
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  /** Bouton rond, icône seule (remplace `IconButton` sur les surfaces en verre). */
  iconOnly?: boolean;
  loading?: boolean;
  disabled?: boolean;
  size?: Size;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

const HEIGHT: Record<Size, number> = { sm: 36, md: MIN_TOUCH + 4, lg: 56 };
const ICON: Record<Size, number> = { sm: 16, md: 19, lg: 22 };

/**
 * Bouton en verre, en forme de capsule. Même interface que `Button` pour passer de l’un à l’autre
 * sans toucher à la logique de l’écran. Appui élastique (ressort interruptible), sauf si « Réduire les
 * animations » est activé ; sur iOS 26, c’est le matériau système qui réagit au doigt.
 */
export function GlassButton({
  label,
  onPress,
  variant = 'glass',
  icon,
  iconOnly = false,
  loading = false,
  disabled = false,
  size = 'md',
  accessibilityHint,
  style,
}: GlassButtonProps) {
  const { colors } = useTheme();
  const { mode } = useGlass();
  const styles = useStyles();
  const reducedMotion = useReducedMotion();
  const inactive = disabled || loading;
  const tinted = variant === 'prominent' || variant === 'destructive';
  const fg = tinted ? colors.onPrimary : variant === 'danger' ? colors.danger : colors.text;
  const height = HEIGHT[size];
  // Sur iOS 26, le verre interactif gonfle et brille déjà sous le doigt : pas de double effet.
  const springy = !reducedMotion && mode !== 'native';

  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={[pressStyle, inactive && styles.disabled, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={() => {
          if (springy) scale.set(withSpring(GLASS_PRESS_SCALE, glassSpring.press));
        }}
        onPressOut={() => {
          if (springy) scale.set(withSpring(1, glassSpring.release));
        }}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: inactive, busy: loading }}
        hitSlop={height < MIN_TOUCH ? (MIN_TOUCH - height) / 2 : undefined}
      >
        {({ pressed }) => (
          <GlassSurface
            material="regular"
            radius={glassRadius.pill}
            prominent={tinted}
            tint={variant === 'destructive' ? colors.danger : undefined}
            interactive={!inactive}
            elevation={tinted ? 'high' : 'low'}
            style={[
              styles.base,
              { minHeight: height },
              iconOnly ? { width: height, paddingHorizontal: 0 } : size === 'lg' && styles.large,
              // Retour visuel immédiat quand aucun ressort ne joue (animations réduites, Android sans ressort…).
              pressed && !springy && mode !== 'native' && styles.pressed,
            ]}
          >
            <View style={styles.content}>
              {loading ? (
                <ActivityIndicator color={fg} />
              ) : icon ? (
                <Ionicons name={icon} size={iconOnly ? ICON[size] + 3 : ICON[size]} color={fg} />
              ) : null}
              {iconOnly ? null : (
                <Text
                  style={[styles.label, size === 'lg' && styles.labelLarge, size === 'sm' && styles.labelSmall, { color: fg }]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={CHROME_FONT_SCALE}
                >
                  {label}
                </Text>
              )}
            </View>
          </GlassSurface>
        )}
      </Pressable>
    </Animated.View>
  );
}

const useStyles = makeStyles(() => ({
  base: { paddingHorizontal: spacing.lg, justifyContent: 'center' },
  large: { paddingHorizontal: spacing.xl },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  label: { fontSize: fontSize.body, fontWeight: '700', letterSpacing: -0.1 },
  labelLarge: { fontSize: fontSize.bodyLarge },
  labelSmall: { fontSize: fontSize.caption },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
}));
