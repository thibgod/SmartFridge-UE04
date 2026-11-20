import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { RecipeImage } from '@/components/recipes/RecipeImage';
import { isRecipeLocked } from '@/features/premium/limits';
import { usePremium } from '@/features/premium/PremiumProvider';
import { fontSize, makeStyles, radius, spacing } from '@/theme';
import type { Recipe } from '@/types/content';

interface RecipeTileProps {
  recipe: Recipe;
  width: number;
  /** Ex. « Utilise : courgettes, crème ». */
  caption?: string;
  highlight?: boolean;
  favorite?: boolean;
}

/** Carte recette visuelle : photo plein cadre, titre posé sur un dégradé lisible. */
function RecipeTileComponent({ recipe, width, caption, highlight = false, favorite = false }: RecipeTileProps) {
  const styles = useStyles();
  // Recette Premium : un cadenas l’indique, la fiche reste consultable.
  const locked = isRecipeLocked(recipe.id, usePremium().isPremium);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: recipe.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${recipe.title}, ${recipe.durationMinutes} minutes${locked ? ', recette Premium' : ''}${caption ? `. ${caption}` : ''}`}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}
    >
      <RecipeImage recipe={recipe} style={[styles.image, { height: width * 0.72 }]} />
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.78)']} style={styles.gradient} pointerEvents="none" />
      <View style={styles.badges}>
        <View style={styles.badge}>
          <Ionicons name="time-outline" size={12} color="#FFFFFF" />
          <Text style={styles.badgeText}>{recipe.durationMinutes} min</Text>
        </View>
        {highlight ? (
          <View style={[styles.badge, styles.badgeUrgent]}>
            <Ionicons name="flash" size={12} color="#1B1300" />
            <Text style={[styles.badgeText, styles.badgeUrgentText]}>Anti-gaspi</Text>
          </View>
        ) : null}
      </View>
      {locked ? (
        <View style={styles.favorite}>
          <Ionicons name="lock-closed" size={13} color="#FFFFFF" />
        </View>
      ) : favorite ? (
        <View style={styles.favorite} accessibilityLabel="Favori">
          <Ionicons name="heart" size={14} color="#FFFFFF" />
        </View>
      ) : null}
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={2}>
          {recipe.title}
        </Text>
        {caption ? (
          <Text style={styles.caption} numberOfLines={1}>
            {caption}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export const RecipeTile = memo(RecipeTileComponent);

const useStyles = makeStyles(({ shadow }) => ({
  card: { borderRadius: radius.xl, overflow: 'hidden', backgroundColor: '#222', ...shadow },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  image: { width: '100%' },
  gradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '70%' },
  badges: { position: 'absolute', top: spacing.sm, left: spacing.sm, flexDirection: 'row', gap: spacing.xs },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  badgeText: { color: '#FFFFFF', fontSize: fontSize.micro, fontWeight: '700' },
  favorite: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  badgeUrgent: { backgroundColor: '#FFC56B' },
  badgeUrgentText: { color: '#1B1300' },
  text: { position: 'absolute', left: spacing.md, right: spacing.md, bottom: spacing.md, gap: 2 },
  title: { color: '#FFFFFF', fontSize: fontSize.bodyLarge, fontWeight: '800' },
  caption: { color: 'rgba(255,255,255,0.88)', fontSize: fontSize.caption, fontWeight: '600' },
}));
