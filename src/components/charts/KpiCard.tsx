import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { IconName } from '@/types/content';

export interface KpiDelta {
  /** Écart brut avec la période précédente (même unité que la valeur). */
  value: number;
  /** Texte déjà formaté (ex. « +2,40 € »). */
  label: string;
  /** Sens souhaitable : économiser plus = 'up', jeter moins = 'down'. */
  goodWhen: 'up' | 'down';
}

interface KpiCardProps {
  label: string;
  value: string;
  icon: IconName;
  accent: { fg: string; bg: string };
  delta?: KpiDelta | null;
  caption?: string;
}

/**
 * Indicateur clé : valeur en grand, et tendance par rapport à la période précédente.
 * La tendance est portée par une flèche et un signe, la couleur ne fait que la renforcer.
 */
export function KpiCard({ label, value, icon, accent, delta, caption }: KpiCardProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const trend = delta && delta.value !== 0 ? delta : null;
  const good = trend ? (trend.value > 0) === (trend.goodWhen === 'up') : false;
  const trendColor = good ? colors.success : colors.danger;
  const a11yTrend = trend ? `, ${trend.label} par rapport à la période précédente` : '';

  return (
    <View style={styles.card} accessible accessibilityLabel={`${label} : ${value}${a11yTrend}`}>
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: accent.bg }]}>
          <Ionicons name={icon} size={15} color={accent.fg} />
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {trend ? (
        <View style={[styles.trend, { backgroundColor: good ? colors.successSoft : colors.dangerSoft }]}>
          <Ionicons name={trend.value > 0 ? 'arrow-up' : 'arrow-down'} size={12} color={trendColor} />
          <Text style={[styles.trendText, { color: trendColor }]}>{trend.label} vs avant</Text>
        </View>
      ) : delta && delta.value === 0 ? (
        <Text style={styles.stable}>= stable</Text>
      ) : null}
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: fontSize.caption + 1, color: colors.textMuted, fontWeight: '700' },
  value: { fontSize: fontSize.title + 2, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  trendText: { fontSize: fontSize.micro, fontWeight: '800' },
  stable: { fontSize: fontSize.micro + 1, color: colors.textSubtle, fontWeight: '600' },
  caption: { fontSize: fontSize.micro + 1, color: colors.textSubtle },
}));
