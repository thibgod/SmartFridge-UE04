import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { CHROME_FONT_SCALE, fontSize, makeStyles, MIN_TOUCH, radius, spacing, useTheme, type Palette } from '@/theme';
import type { IconName } from '@/types/content';

type Variant = 'primary' | 'secondary' | 'tonal' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}

function variantColors(c: Palette, variant: Variant) {
  switch (variant) {
    case 'primary':
      return { bg: c.primary, pressed: c.primaryPressed, fg: c.onPrimary, border: c.primary };
    case 'secondary':
      return { bg: c.surface, pressed: c.surfaceMuted, fg: c.text, border: c.border };
    case 'tonal':
      return { bg: c.primarySoft, pressed: c.surfaceMuted, fg: c.primary, border: c.primarySoft };
    case 'ghost':
      return { bg: 'transparent', pressed: c.surfaceMuted, fg: c.primary, border: 'transparent' };
    case 'danger':
      return { bg: c.dangerSoft, pressed: c.surfaceMuted, fg: c.danger, border: c.dangerSoft };
  }
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  size = 'md',
  accessibilityHint,
  style,
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const palette = variantColors(colors, variant);
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' && styles.large,
        size === 'sm' && styles.small,
        { backgroundColor: pressed ? palette.pressed : palette.bg, borderColor: palette.border },
        pressed && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={palette.fg} />
        ) : icon ? (
          <Ionicons name={icon} size={size === 'lg' ? 22 : size === 'sm' ? 16 : 19} color={palette.fg} />
        ) : null}
        <Text
          style={[styles.label, size === 'lg' && styles.labelLarge, size === 'sm' && styles.labelSmall, { color: palette.fg }]}
          numberOfLines={1}
          maxFontSizeMultiplier={CHROME_FONT_SCALE}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles(() => ({
  base: {
    minHeight: MIN_TOUCH + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    justifyContent: 'center',
  },
  large: { minHeight: 56, borderRadius: radius.lg, paddingHorizontal: spacing.xl },
  small: { minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill },
  pressed: { transform: [{ scale: 0.98 }] },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  label: { fontSize: fontSize.body, fontWeight: '700' },
  labelLarge: { fontSize: fontSize.bodyLarge },
  labelSmall: { fontSize: fontSize.caption },
  disabled: { opacity: 0.45 },
}));
