import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text } from 'react-native';

import { CHROME_FONT_SCALE, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { IconName } from '@/types/content';

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
  accessibilityLabel?: string;
  size?: 'sm' | 'md';
}

/** Puce sélectionnable (filtres, raccourcis, options de réglage). */
export function Chip({ label, selected, onPress, icon, accessibilityLabel, size = 'md' }: ChipProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const fg = selected ? colors.onPrimary : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        size === 'sm' && styles.small,
        selected ? styles.selected : styles.unselected,
        pressed && !selected && styles.pressed,
      ]}
    >
      {icon ? <Ionicons name={icon} size={size === 'sm' ? 15 : 17} color={selected ? colors.onPrimary : colors.primary} /> : null}
      <Text style={[styles.label, size === 'sm' && styles.labelSmall, { color: fg }]} maxFontSizeMultiplier={CHROME_FONT_SCALE}>
        {label}
      </Text>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    minHeight: 40,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  small: { minHeight: 34, paddingHorizontal: spacing.md },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  unselected: { backgroundColor: colors.surface, borderColor: colors.border },
  pressed: { backgroundColor: colors.surfaceMuted },
  label: { fontSize: fontSize.body, fontWeight: '600' },
  labelSmall: { fontSize: fontSize.caption },
}));
