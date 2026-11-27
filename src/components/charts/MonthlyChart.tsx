import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { GlassSegmentedControl } from '@/components/glass';
import { niceMax } from '@/utils/chart';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import { formatCents } from '@/utils/price';
import type { MonthBucket, MonthlyAmounts } from '@/utils/stats';
import { pluralize } from '@/utils/text';

const PLOT_HEIGHT = 150;
const BAR_WIDTH = 22;
/** Espace de la couleur du fond entre deux segments empilés. */
const SEGMENT_GAP = 2;

type Unit = 'count' | 'euros';

interface MonthlyChartProps {
  months: MonthBucket[];
  amounts: MonthlyAmounts[];
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Barres empilées consommés / jetés par mois, en nombre de produits ou en euros.
 * Toucher un mois affiche ses valeurs (équivalent mobile de l’infobulle) ; les barres
 * poussent depuis l’axe à chaque changement d’unité.
 */
export function MonthlyChart({ months, amounts }: MonthlyChartProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [unit, setUnit] = useState<Unit>('count');
  const [selectedKey, setSelectedKey] = useState(months.at(-1)?.key);
  const [grow] = useState(() => new Animated.Value(0));
  const reduceMotion = useReducedMotion();

  const rows = useMemo(
    () =>
      months.map((month, index) => {
        const amount = amounts[index];
        const consumed = unit === 'count' ? month.consumed : (amount?.consumedCents ?? 0);
        const discarded = unit === 'count' ? month.discarded : (amount?.discardedCents ?? 0);
        return { ...month, consumedValue: consumed, discardedValue: discarded };
      }),
    [months, amounts, unit],
  );

  const max = niceMax(Math.max(...rows.map((r) => r.consumedValue + r.discardedValue)));
  const format = (value: number) => (unit === 'count' ? String(value) : formatCents(value).replace(/,00\s?€/, ' €'));
  const selected = rows.find((r) => r.key === selectedKey) ?? rows.at(-1);
  const isEmpty = rows.every((r) => r.consumedValue + r.discardedValue === 0);

  useEffect(() => {
    // « Réduire les animations » : les barres s’affichent directement à leur hauteur.
    if (reduceMotion) {
      grow.setValue(1);
      return;
    }
    grow.setValue(0);
    Animated.timing(grow, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [grow, unit, months, reduceMotion]);

  const describe = (row: (typeof rows)[number]) =>
    unit === 'count'
      ? `${pluralize(row.consumedValue, 'consommé')} · ${pluralize(row.discardedValue, 'jeté')}`
      : `${formatCents(row.consumedValue)} mangés · ${formatCents(row.discardedValue)} perdus`;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Les 6 derniers mois
        </Text>
        <View style={styles.toggle}>
          <GlassSegmentedControl
            segments={[
              { value: 'count', label: 'Produits' },
              { value: 'euros', label: 'Euros' },
            ]}
            value={unit}
            onChange={setUnit}
          />
        </View>
      </View>

      <View style={styles.legend}>
        <LegendItem color={colors.chartConsumed} label={unit === 'count' ? 'Consommés' : 'Mangés'} />
        <LegendItem color={colors.chartDiscarded} label={unit === 'count' ? 'Jetés' : 'Perdus'} />
      </View>

      {selected ? (
        <View style={styles.readout} accessibilityLiveRegion="polite">
          <Text style={styles.readoutMonth}>{capitalize(selected.longLabel)}</Text>
          <Text style={styles.readoutValue}>{describe(selected)}</Text>
        </View>
      ) : null}

      <View style={styles.chart}>
        <View style={styles.axis}>
          {[max, max / 2, 0].map((tick) => (
            <Text key={tick} style={styles.tick}>
              {Number.isInteger(tick) ? format(tick) : ''}
            </Text>
          ))}
        </View>
        <View style={styles.plot}>
          {[0, 0.5, 1].map((ratio) => (
            <View key={ratio} style={[styles.gridLine, { top: (1 - ratio) * PLOT_HEIGHT }]} />
          ))}
          {rows.map((row) => {
            const isSelected = row.key === selected?.key;
            const consumedHeight = (row.consumedValue / max) * PLOT_HEIGHT;
            const discardedHeight = (row.discardedValue / max) * PLOT_HEIGHT;
            return (
              <Pressable
                key={row.key}
                onPress={() => setSelectedKey(row.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${row.longLabel} : ${describe(row)}`}
                style={styles.column}
                hitSlop={{ top: 0, bottom: 0, left: 4, right: 4 }}
              >
                <Animated.View style={[styles.bar, { opacity: isSelected || isEmpty ? 1 : 0.55, transform: [{ scaleY: grow }] }]}>
                  {row.discardedValue > 0 ? (
                    <View
                      style={[
                        styles.segment,
                        styles.top,
                        { height: discardedHeight, backgroundColor: colors.chartDiscarded },
                        row.consumedValue > 0 && { marginBottom: SEGMENT_GAP },
                      ]}
                    />
                  ) : null}
                  {row.consumedValue > 0 ? (
                    <View
                      style={[
                        styles.segment,
                        row.discardedValue === 0 && styles.top,
                        { height: consumedHeight, backgroundColor: colors.chartConsumed },
                      ]}
                    />
                  ) : null}
                </Animated.View>
                <Text style={[styles.month, isSelected && styles.monthSelected]}>{row.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      {isEmpty ? <Text style={styles.empty}>Aucun produit clôturé sur ces 6 mois.</Text> : null}
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  title: { fontSize: fontSize.bodyLarge, fontWeight: '800', color: colors.text },
  toggle: { width: 170 },
  legend: { flexDirection: 'row', gap: spacing.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  swatch: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { fontSize: fontSize.caption, color: colors.textMuted },
  readout: {
    marginTop: spacing.xs,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  readoutMonth: { fontSize: fontSize.caption, fontWeight: '800', color: colors.textMuted },
  readoutValue: { fontSize: fontSize.body, fontWeight: '700', color: colors.text, marginTop: 1 },
  chart: { flexDirection: 'row', marginTop: spacing.sm },
  axis: { height: PLOT_HEIGHT, justifyContent: 'space-between', paddingRight: spacing.sm, marginTop: -6 },
  tick: { fontSize: fontSize.micro, color: colors.textSubtle, textAlign: 'right', minWidth: 22 },
  plot: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.chartGrid },
  column: { flex: 1, alignItems: 'center', minHeight: 44 },
  bar: { height: PLOT_HEIGHT, justifyContent: 'flex-end', alignItems: 'center', transformOrigin: 'bottom' },
  segment: { width: BAR_WIDTH },
  top: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  month: { fontSize: fontSize.caption, color: colors.textMuted, marginTop: spacing.xs },
  monthSelected: { color: colors.text, fontWeight: '800' },
  empty: { fontSize: fontSize.caption, color: colors.textMuted, textAlign: 'center' },
}));
