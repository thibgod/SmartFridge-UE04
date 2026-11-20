import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';

import { makeStyles, MIN_TOUCH, useTheme } from '@/theme';
import type { IconName } from '@/types/content';

type Tone = 'neutral' | 'primary' | 'success' | 'danger' | 'onImage';

interface IconButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: Tone;
  /** Fond teinté plutôt que contour. */
  filled?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

/** Bouton icône circulaire : toujours une zone tactile ≥ 44 pt et un libellé accessible. */
export function IconButton({ icon, label, onPress, tone = 'neutral', filled = false, size = MIN_TOUCH, style }: IconButtonProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const palette = {
    neutral: { fg: colors.text, bg: colors.surface, border: colors.border },
    primary: { fg: colors.primary, bg: colors.primarySoft, border: colors.primarySoft },
    success: { fg: colors.success, bg: colors.successSoft, border: colors.successSoft },
    danger: { fg: colors.danger, bg: colors.dangerSoft, border: colors.dangerSoft },
    onImage: { fg: '#FFFFFF', bg: 'rgba(0,0,0,0.42)', border: 'transparent' },
  }[tone];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={Math.max(0, (MIN_TOUCH - size) / 2)}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: filled || tone === 'onImage' ? palette.bg : colors.surface,
          borderColor: filled ? palette.border : colors.border,
        },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.48)} color={palette.fg} />
    </Pressable>
  );
}

const useStyles = makeStyles(() => ({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
}));
