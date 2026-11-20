import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { fontSize, makeStyles, spacing, useTheme } from '@/theme';
import type { IconName } from '@/types/content';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message: string;
  tone?: 'neutral' | 'error';
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon, title, message, tone = 'neutral', action, compact = false }: EmptyStateProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const isError = tone === 'error';
  return (
    <View style={[styles.container, compact && styles.compact]} accessibilityRole={isError ? 'alert' : undefined}>
      <View style={[styles.iconCircle, { backgroundColor: isError ? colors.dangerSoft : colors.primarySoft }]}>
        <Ionicons name={icon} size={compact ? 28 : 36} color={isError ? colors.danger : colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  container: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl, gap: spacing.sm },
  compact: { paddingVertical: spacing.xl },
  iconCircle: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  title: { fontSize: fontSize.title, fontWeight: '800', color: colors.text, textAlign: 'center' },
  message: { fontSize: fontSize.body, color: colors.textMuted, textAlign: 'center', lineHeight: 22, maxWidth: 420 },
  action: { marginTop: spacing.md, alignSelf: 'stretch', gap: spacing.sm, maxWidth: 420, width: '100%', marginHorizontal: 'auto' },
}));
