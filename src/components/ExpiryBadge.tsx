import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { fontSize, makeStyles, radius, spacing, useTheme, type Palette } from '@/theme';
import type { IconName } from '@/types/content';
import type { ExpiryLevel } from '@/utils/expiry';

export function expiryColors(colors: Palette, level: ExpiryLevel): { fg: string; bg: string; icon: IconName } {
  switch (level) {
    case 'expired':
      return { fg: colors.danger, bg: colors.dangerSoft, icon: 'alert-circle' };
    case 'urgent':
      return { fg: colors.warning, bg: colors.warningSoft, icon: 'time' };
    case 'ok':
      return { fg: colors.success, bg: colors.successSoft, icon: 'checkmark-circle' };
  }
}

interface ExpiryBadgeProps {
  level: ExpiryLevel;
  label: string;
  size?: 'sm' | 'md';
}

/** Badge de statut : la couleur est toujours doublée d’une icône et d’un texte. */
export function ExpiryBadge({ level, label, size = 'md' }: ExpiryBadgeProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const palette = expiryColors(colors, level);
  return (
    <View style={[styles.badge, size === 'sm' && styles.small, { backgroundColor: palette.bg }]} accessibilityLabel={label}>
      <Ionicons name={palette.icon} size={size === 'sm' ? 13 : 15} color={palette.fg} />
      <Text style={[styles.label, size === 'sm' && styles.labelSmall, { color: palette.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  small: { paddingHorizontal: spacing.sm, paddingVertical: 3, gap: 3 },
  label: { fontSize: fontSize.caption, fontWeight: '700' },
  labelSmall: { fontSize: fontSize.micro + 1 },
}));
