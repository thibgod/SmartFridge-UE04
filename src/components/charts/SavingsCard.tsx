import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { savingsText } from '@/features/stats/savings';
import { CHROME_FONT_SCALE, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { AverageComparison, WasteStats } from '@/types/stats';

interface SavingsCardProps {
  comparison: AverageComparison;
  stats: WasteStats;
  urgentThreshold: number;
}

/**
 * Économies mises en contexte : la part des courses jetée (en valeur) comparée à un foyer moyen,
 * avec deux barres à la même échelle, puis ce que l’app a aidé à sauver de justesse.
 */
export function SavingsCard({ comparison, stats, urgentThreshold }: SavingsCardProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const text = savingsText(comparison, stats, urgentThreshold);
  // Échelle commune : la plus grande des deux barres occupe 80 % de la piste.
  const scale = Math.max(comparison.share, comparison.averageShare) / 0.8;
  const youColor = comparison.verdict === 'worse' ? colors.danger : colors.success;
  const bar = (label: string, share: number, color: string) => (
    <View style={styles.barRow} accessible accessibilityLabel={`${label} : ${Math.round(share * 100)} % jetés`}>
      <Text style={styles.barLabel} maxFontSizeMultiplier={CHROME_FONT_SCALE}>
        {label}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(2, (share / scale) * 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.barValue} maxFontSizeMultiplier={CHROME_FONT_SCALE}>
        {`${Math.round(share * 100)}\u00a0%`}
      </Text>
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="people-outline" size={18} color={colors.primary} />
        <Text style={styles.title} maxFontSizeMultiplier={CHROME_FONT_SCALE}>
          Par rapport à un foyer moyen
        </Text>
      </View>
      <View style={styles.bars}>
        {bar('Vous', comparison.share, youColor)}
        {bar('Foyer moyen', comparison.averageShare, colors.textMuted)}
      </View>
      <Text style={styles.body}>{text.headline}</Text>
      {text.rescued ? (
        <View style={styles.rescued}>
          <Ionicons name="sparkles-outline" size={16} color={colors.success} />
          <Text style={styles.rescuedText}>{text.rescued}</Text>
        </View>
      ) : null}
      <Text style={styles.note}>
        {
          'Part jetée en valeur, sur les produits au prix connu. Moyenne\u00a0: environ 15\u00a0% des courses alimentaires (WRAP, ADEME).'
        }
      </Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  card: { padding: spacing.lg, gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  title: { fontSize: fontSize.body, fontWeight: '800', color: colors.text },
  bars: { gap: spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  barLabel: { width: 92, fontSize: fontSize.caption, color: colors.textMuted },
  track: { flex: 1, height: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
  barValue: {
    width: 44,
    textAlign: 'right',
    fontSize: fontSize.caption,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  body: { fontSize: fontSize.body, color: colors.text, lineHeight: 21 },
  rescued: { flexDirection: 'row', gap: spacing.xs + 2, alignItems: 'flex-start' },
  rescuedText: { flex: 1, fontSize: fontSize.caption, color: colors.text, lineHeight: 18 },
  note: { fontSize: fontSize.micro + 1, color: colors.textMuted },
}));
