import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { CATEGORIES, CATEGORY_ORDER, categoryTone } from '@/constants/catalog';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { ProductCategory } from '@/types/product';
import { haptics } from '@/utils/haptics';

interface CategoryGridProps {
  value: ProductCategory;
  onChange: (value: ProductCategory) => void;
}

/** Catégories en tuiles 3 × 2 : grandes cibles tactiles, repérage immédiat par l’icône et la couleur. */
export function CategoryGrid({ value, onChange }: CategoryGridProps) {
  const { isDark } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.grid} accessibilityRole="radiogroup">
      {CATEGORY_ORDER.map((category) => {
        const selected = category === value;
        const tone = categoryTone(category, isDark);
        return (
          <Pressable
            key={category}
            onPress={() => {
              haptics.select();
              onChange(category);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={CATEGORIES[category].label}
            style={({ pressed }) => [
              styles.tile,
              selected && { backgroundColor: tone.bg, borderColor: tone.fg },
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.icon, { backgroundColor: tone.bg }]}>
              <Ionicons name={CATEGORIES[category].icon} size={20} color={tone.fg} />
            </View>
            <Text style={[styles.label, selected && { color: tone.fg }]} numberOfLines={2}>
              {CATEGORIES[category].shortLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: {
    width: '31.8%',
    flexGrow: 1,
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: { opacity: 0.75 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: fontSize.caption, fontWeight: '700', color: colors.text, textAlign: 'center' },
}));
