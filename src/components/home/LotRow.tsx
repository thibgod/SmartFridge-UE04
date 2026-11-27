import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';

import { expiryColors } from '@/components/ExpiryBadge';
import { CHROME_FONT_SCALE, MIN_TOUCH, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { Product } from '@/types/product';
import { formatDayMonth, toLocalDateString } from '@/utils/date';
import { getCompactExpiryLabel, getExpiryInfo } from '@/utils/expiry';
import { formatRemaining } from '@/utils/remaining';

interface LotRowProps {
  /** Premier lot d’un paquet de lots identiques. */
  product: Product;
  /** Nombre de lots identiques (même jour d’achat, même date). */
  count?: number;
  urgentThreshold: number;
  onPress: (product: Product) => void;
}

/** Un lot d’un produit regroupé, affiché sous sa ligne : sa date, sa quantité, ce qu’il en reste. */
function LotRowComponent({ product, count = 1, urgentThreshold, onPress }: LotRowProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const reduceMotion = useReducedMotion();
  const expiry = getExpiryInfo(product.expiresAt, new Date(), urgentThreshold);
  const tone = expiryColors(colors, expiry.level);
  const added = formatDayMonth(toLocalDateString(new Date(product.addedAt)));
  const quantity = product.quantity ? `${count > 1 ? `${count} × ` : ''}${product.quantity}` : count > 1 ? `${count} lots` : '';
  const details = [
    quantity,
    `${count > 1 ? 'ajoutés' : 'ajouté'} le ${added}`,
    product.remaining ? `reste ${formatRemaining(product.remaining)}` : product.openedAt ? 'entamé' : '',
  ].filter(Boolean);

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(180)}
      exiting={reduceMotion ? undefined : FadeOut.duration(160)}
      style={styles.wrap}
    >
      <Pressable
        onPress={() => onPress(product)}
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${expiry.label}, ${details.join(', ')}`}
        accessibilityHint={count > 1 ? 'Ouvre la fiche du premier de ces lots.' : 'Ouvre la fiche de ce lot.'}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={[styles.pill, { backgroundColor: tone.bg }]}>
          <Text style={[styles.pillText, { color: tone.fg }]} numberOfLines={1} maxFontSizeMultiplier={CHROME_FONT_SCALE}>
            {getCompactExpiryLabel(expiry.days)}
          </Text>
        </View>
        <Text style={styles.details} numberOfLines={1}>
          {details.join(' · ')}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
      </Pressable>
    </Animated.View>
  );
}

export const LotRow = memo(LotRowComponent);

const useStyles = makeStyles(({ colors }) => ({
  wrap: { marginLeft: spacing.xl, marginBottom: spacing.xs + 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  pill: { minWidth: 52, alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  pillText: { fontSize: fontSize.caption, fontWeight: '800', fontVariant: ['tabular-nums'] },
  details: { flex: 1, fontSize: fontSize.caption, color: colors.textMuted },
}));
