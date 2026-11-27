import type { PropsWithChildren } from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

import { makeStyles, spacing } from '@/theme';
import { glassRadius, glassSpring, type GlassMaterial } from '@/theme/liquidGlass';

import { GlassSurface, type GlassElevation } from './GlassSurface';
import { useGlass } from './useGlass';

interface GlassCardProps {
  material?: GlassMaterial;
  elevation?: GlassElevation;
  /** Marge intérieure ; 0 pour une carte qui contient une photo pleine largeur. */
  padding?: number;
  /** Carte touchable : elle s’enfonce légèrement sous le doigt. */
  onPress?: () => void;
  onLongPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

/** Carte en verre. Le contenu reste libre ; les marges intérieures suivent les coins concentriques. */
export function GlassCard({
  material = 'regular',
  elevation = 'low',
  padding = spacing.lg,
  onPress,
  onLongPress,
  accessibilityLabel,
  accessibilityHint,
  style,
  children,
}: PropsWithChildren<GlassCardProps>) {
  const styles = useStyles();
  const { mode } = useGlass();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const surface = (pressed = false) => (
    <GlassSurface
      material={material}
      elevation={elevation}
      radius={glassRadius.card}
      interactive={Boolean(onPress)}
      style={[styles.card, { padding }, pressed && reducedMotion && mode !== 'native' && styles.pressed, style]}
    >
      {children}
    </GlassSurface>
  );

  if (!onPress && !onLongPress) return surface();

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() => {
          if (!reducedMotion) scale.set(withSpring(0.98, glassSpring.press));
        }}
        onPressOut={() => {
          if (!reducedMotion) scale.set(withSpring(1, glassSpring.release));
        }}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        {({ pressed }) => surface(pressed)}
      </Pressable>
    </Animated.View>
  );
}

const useStyles = makeStyles(() => ({
  card: { overflow: 'visible' },
  pressed: { opacity: 0.75 },
}));
