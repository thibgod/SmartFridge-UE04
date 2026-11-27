import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FoodImage } from '@/components/FoodImage';
import type { RestockSuggestion } from '@/features/shopping/restockPlan';
import { CHROME_FONT_SCALE, MIN_TOUCH, PRESSED, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';

interface RestockListProps {
  suggestions: readonly RestockSuggestion[];
  onAdd: (suggestion: RestockSuggestion) => void;
}

/** Produits à racheter avec la quantité proposée et la raison, ajoutés à la liste d’un toucher. */
export function RestockList({ suggestions, onAdd }: RestockListProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.card}>
      {suggestions.map((s, index) => (
        <Pressable
          key={s.name}
          onPress={() => onAdd(s)}
          accessibilityRole="button"
          accessibilityLabel={`Ajouter ${s.name}${s.quantity ? `, ${s.quantity}` : ''} à la liste`}
          accessibilityHint={s.reason}
          style={({ pressed }) => [styles.row, index > 0 && styles.divider, pressed && PRESSED]}
        >
          <FoodImage name={s.name} category={s.category} size={40} radius={radius.md} />
          <View style={styles.info}>
            <View style={styles.titleRow}>
              <Text style={styles.name} numberOfLines={1}>
                {s.name}
              </Text>
              {s.quantity ? (
                <View style={styles.pill}>
                  <Text style={styles.pillText} numberOfLines={1} maxFontSizeMultiplier={CHROME_FONT_SCALE}>
                    {s.quantity}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.reason} numberOfLines={2}>
              {s.reason}
            </Text>
          </View>
          <View style={styles.add}>
            <Ionicons name="add" size={20} color={colors.onPrimary} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: MIN_TOUCH + 12, padding: spacing.sm + 2 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  info: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flexShrink: 1, fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  pillText: { fontSize: fontSize.caption, fontWeight: '800', color: colors.primary, fontVariant: ['tabular-nums'] },
  reason: { fontSize: fontSize.caption, color: colors.textMuted, lineHeight: 17 },
  add: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
}));
