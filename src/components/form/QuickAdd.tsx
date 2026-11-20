import { Pressable, ScrollView, Text, View } from 'react-native';

import { FoodImage } from '@/components/FoodImage';
import { fontSize, makeStyles, radius, spacing } from '@/theme';
import type { Product } from '@/types/product';
import type { FrequentProduct } from '@/utils/products';

interface QuickAddProps {
  items: FrequentProduct[];
  onPick: (product: Product) => void;
}

/**
 * Ajout express : les produits achetés le plus souvent, en un toucher.
 * Tout est prérempli (catégorie, emplacement, prix) sauf la date.
 */
export function QuickAdd({ items, onPick }: QuickAddProps) {
  const styles = useStyles();
  if (items.length === 0) return null;
  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Vos habitués</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} keyboardShouldPersistTaps="handled">
        {items.map(({ latest, count }) => (
          <Pressable
            key={latest.id}
            onPress={() => onPick(latest)}
            accessibilityRole="button"
            accessibilityLabel={`Ajouter de nouveau ${latest.name}${count > 1 ? `, acheté ${count} fois` : ''}`}
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <FoodImage name={latest.name} category={latest.category} uri={latest.imageUri} size={30} radius={15} />
            <Text style={styles.label} numberOfLines={1}>
              {latest.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  wrapper: { gap: spacing.sm, marginBottom: spacing.xl },
  title: { fontSize: fontSize.caption + 1, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  row: { gap: spacing.sm, paddingRight: spacing.lg },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: 5,
    paddingRight: spacing.md,
    height: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    maxWidth: 200,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  label: { fontSize: fontSize.body, fontWeight: '600', color: colors.text, flexShrink: 1 },
}));
