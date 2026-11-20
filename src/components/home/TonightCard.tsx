import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { RecipeImage } from '@/components/recipes/RecipeImage';
import { RECIPES } from '@/data/recipes';
import { isRecipeLocked } from '@/features/premium/limits';
import { usePremium } from '@/features/premium/PremiumProvider';
import { pickPriorityRecipes, rankRecipes } from '@/features/recipes/recipeMatching';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { LocalDateString, Product } from '@/types/product';
import { parseLocalDate } from '@/utils/date';

interface TonightCardProps {
  products: readonly Product[];
  /** Jour courant (AAAA-MM-JJ) : une chaîne stable pour ne recalculer qu’en cas de changement. */
  today: LocalDateString;
  threshold: number;
}

/**
 * « Ce soir » : la recette qui sauve le plus de produits urgents, à un toucher de l’accueil.
 * Masquée quand rien ne presse (l’onglet Recettes reste là pour l’inspiration).
 */
export function TonightCard({ products, today, threshold }: TonightCardProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { isPremium } = usePremium();
  // Raccourci de l’accueil : il mène toujours à une recette accessible, jamais à un cadenas.
  const match = useMemo(() => {
    const available = RECIPES.filter((recipe) => !isRecipeLocked(recipe.id, isPremium));
    return pickPriorityRecipes(rankRecipes(available, products, parseLocalDate(today), threshold), 1)[0];
  }, [products, today, threshold, isPremium]);
  if (!match) return null;

  const { recipe, urgentProducts, coverage } = match;
  const saves = urgentProducts
    .map((p) => p.name)
    .slice(0, 3)
    .join(', ');
  const missing = coverage.total - coverage.have;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
      accessibilityRole="button"
      accessibilityLabel={`Idée pour ce soir : ${recipe.title}, ${recipe.durationMinutes} minutes. Sauve ${saves}.`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <RecipeImage recipe={recipe} style={styles.image} width={300} />
      <View style={styles.body}>
        <Text style={styles.eyebrow}>Idée pour ce soir</Text>
        <Text style={styles.title} numberOfLines={2}>
          {recipe.title}
        </Text>
        <Text style={styles.saves} numberOfLines={1}>
          Sauve : {saves}
        </Text>
        <View style={styles.meta}>
          <Ionicons name="time-outline" size={13} color={colors.textMuted} />
          <Text style={styles.metaText}>{recipe.durationMinutes} min</Text>
          <Text style={styles.metaText}>·</Text>
          <Text style={[styles.metaText, missing === 0 && styles.ready]}>
            {missing === 0 ? 'Tout est là' : `${missing} ingrédient${missing > 1 ? 's' : ''} à prévoir`}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  image: { width: 84, height: 84, borderRadius: radius.md },
  body: { flex: 1, gap: 2 },
  eyebrow: {
    fontSize: fontSize.micro + 1,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: { fontSize: fontSize.bodyLarge - 1, fontWeight: '800', color: colors.text },
  saves: { fontSize: fontSize.caption, color: colors.warning, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontSize: fontSize.caption, color: colors.textMuted },
  ready: { color: colors.success, fontWeight: '700' },
}));
