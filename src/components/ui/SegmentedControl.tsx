import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { CHROME_FONT_SCALE, PRESSED, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { IconName } from '@/types/content';
import { haptics } from '@/utils/haptics';

export interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
  /** Petit compteur affiché à côté du libellé. */
  count?: number;
  accessibilityLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * Choix exclusif en largeur fixe : tous les segments restent visibles (contrairement
 * aux puces défilantes qui coupaient « Congélateur »).
 */
export function SegmentedControl<T extends string>({ segments, value, onChange }: SegmentedControlProps<T>) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {segments.map((segment) => {
        const selected = segment.value === value;
        const fg = selected ? colors.text : colors.textMuted;
        return (
          <Pressable
            key={segment.value}
            onPress={() => {
              if (!selected) haptics.select();
              onChange(segment.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={segment.accessibilityLabel ?? segment.label}
            style={({ pressed }) => [styles.segment, selected && styles.selected, pressed && PRESSED]}
          >
            {segment.icon ? <Ionicons name={segment.icon} size={15} color={selected ? colors.primary : fg} /> : null}
            <Text
              style={[styles.label, { color: fg }, selected && styles.labelSelected]}
              numberOfLines={1}
              maxFontSizeMultiplier={CHROME_FONT_SCALE}
            >
              {segment.label}
            </Text>
            {segment.count !== undefined ? (
              <Text style={[styles.count, selected && styles.countSelected]} maxFontSizeMultiplier={CHROME_FONT_SCALE}>
                {segment.count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(({ colors, isDark, shadow }) => ({
  track: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.md + 2,
    backgroundColor: colors.surfaceMuted,
  },
  segment: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
  },
  selected: { backgroundColor: isDark ? colors.surfaceRaised : colors.surface, ...shadow },
  label: { fontSize: fontSize.caption + 1, fontWeight: '600', flexShrink: 1 },
  labelSelected: { fontWeight: '800' },
  count: { fontSize: fontSize.micro, fontWeight: '700', color: colors.textSubtle },
  countSelected: { color: colors.primary },
}));
