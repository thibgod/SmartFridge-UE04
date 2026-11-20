import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FoodImage } from '@/components/FoodImage';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { Product } from '@/types/product';
import { formatIsoAsShortDate } from '@/utils/date';
import { formatEuros, isValidPrice } from '@/utils/price';

function HistoryItemComponent({ product, onPress }: { product: Product; onPress?: (product: Product) => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const consumed = product.status === 'consumed';
  const statusLabel = consumed ? 'Consommé' : 'Jeté';
  const tone = consumed ? { fg: colors.success, bg: colors.successSoft } : { fg: colors.danger, bg: colors.dangerSoft };
  const priced = isValidPrice(product.price);
  const date = formatIsoAsShortDate(product.closedAt ?? product.updatedAt);

  return (
    <Pressable
      onPress={onPress ? () => onPress(product) : undefined}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${product.name}, ${statusLabel} le ${date}, ${priced ? formatEuros(product.price!) : 'prix non renseigné'}`}
      accessibilityHint={onPress ? 'Racheter ou retirer de l’historique' : undefined}
    >
      <View>
        <FoodImage name={product.name} category={product.category} uri={product.imageUri} size={42} radius={radius.sm} />
        <View style={[styles.status, { backgroundColor: tone.fg }]}>
          <Ionicons name={consumed ? 'checkmark' : 'close'} size={10} color={colors.surface} />
        </View>
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.meta}>
          <Text style={{ color: tone.fg, fontWeight: '700' }}>{statusLabel}</Text>
          {` · ${date}`}
        </Text>
      </View>
      <Text style={[styles.price, !priced && styles.noPrice]}>{priced ? formatEuros(product.price!) : '—'}</Text>
    </Pressable>
  );
}

export const HistoryItem = memo(HistoryItemComponent);

const useStyles = makeStyles(({ colors }) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  status: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  info: { flex: 1, gap: 2 },
  name: { fontSize: fontSize.body, fontWeight: '600', color: colors.text },
  meta: { fontSize: fontSize.caption, color: colors.textMuted },
  price: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  noPrice: { color: colors.textSubtle, fontWeight: '400' },
}));
