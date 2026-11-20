import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { CATEGORIES } from '@/constants/catalog';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import { formatCents } from '@/utils/price';
import type { CategoryWaste } from '@/utils/stats';
import { pluralize } from '@/utils/text';

/** Une seule série (produits jetés) : une seule couleur, barres triées, valeurs écrites en clair. */
export function CategoryWasteList({ items }: { items: CategoryWaste[] }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const max = Math.max(1, ...items.map((item) => item.count));

  return (
    <View style={styles.card}>
      <Text style={styles.title} accessibilityRole="header">
        Ce qui part le plus à la poubelle
      </Text>
      {items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="trophy-outline" size={22} color={colors.success} />
          <Text style={styles.emptyText}>Aucun produit jeté sur cette période. Bravo !</Text>
        </View>
      ) : (
        items.map((item) => {
          const meta = CATEGORIES[item.category];
          return (
            <View
              key={item.category}
              style={styles.row}
              accessible
              accessibilityLabel={`${meta.label} : ${pluralize(item.count, 'produit jeté', 'produits jetés')}${item.lostCents > 0 ? `, ${formatCents(item.lostCents)}` : ''}`}
            >
              <View style={styles.rowHeader}>
                <Ionicons name={meta.icon} size={16} color={colors.textMuted} />
                <Text style={styles.label}>{meta.label}</Text>
                <Text style={styles.value}>
                  {item.count}
                  {item.lostCents > 0 ? <Text style={styles.money}> · {formatCents(item.lostCents)}</Text> : null}
                </Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.bar, { width: `${(item.count / max) * 100}%` }]} />
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  title: { fontSize: fontSize.bodyLarge, fontWeight: '800', color: colors.text },
  empty: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  emptyText: { flex: 1, fontSize: fontSize.body, color: colors.textMuted },
  row: { gap: spacing.xs + 2 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  label: { flex: 1, fontSize: fontSize.body, color: colors.text },
  value: { fontSize: fontSize.body, fontWeight: '800', color: colors.text },
  money: { fontWeight: '400', color: colors.textMuted },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 4, backgroundColor: colors.chartDiscarded },
}));
