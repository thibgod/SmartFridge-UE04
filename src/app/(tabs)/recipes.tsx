import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { EmptyState } from '@/components/EmptyState';
import { RecipeTile } from '@/components/recipes/RecipeTile';
import { SearchBar } from '@/components/SearchBar';
import { Chip } from '@/components/ui/Chip';
import { GlassHeader, useGlassScroll } from '@/components/glass';
import { ScreenHeader, SectionTitle } from '@/components/ui/Screen';
import { RECIPES } from '@/data/recipes';
import { usePlaceProducts } from '@/features/places/usePlaceProducts';
import { recipeMatchesQuery } from '@/features/recipes/recipeIngredients';
import { useRecipeLog } from '@/features/recipes/RecipeLogProvider';
import { pickPriorityRecipes, rankRecipes, type RecipeMatch } from '@/features/recipes/recipeMatching';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useLayout } from '@/hooks/useLayout';
import { useToday } from '@/hooks/useToday';
import { fontSize, makeStyles, radius, spacing } from '@/theme';
import type { IconName } from '@/types/content';
import { parseLocalDate } from '@/utils/date';
import { pluralize } from '@/utils/text';

type RecipeFilter = 'all' | 'ready' | 'stock' | 'favorites' | 'quick' | 'vegetarien' | 'dessert';

const FILTERS: readonly { value: RecipeFilter; label: string; icon?: IconName }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'ready', label: 'Prêtes', icon: 'checkmark-done' },
  { value: 'stock', label: 'Avec mes produits' },
  { value: 'favorites', label: 'Favoris', icon: 'heart' },
  { value: 'quick', label: '≤ 20 min', icon: 'time-outline' },
  { value: 'vegetarien', label: 'Végé', icon: 'leaf-outline' },
  { value: 'dessert', label: 'Desserts', icon: 'ice-cream-outline' },
];

const MAX_SUGGESTIONS = 3;
/** « Prête » : tous les ingrédients indispensables sont dans le frigo. */
const isReady = (match: RecipeMatch) => match.coverage.total > 0 && match.coverage.have === match.coverage.total;

const matchCaption = (match: RecipeMatch): string | undefined => {
  if (match.urgentProducts.length > 0) return `Utilise : ${match.urgentProducts.map((p) => p.name).join(', ')}`;
  if (isReady(match)) return 'Tout est dans votre frigo';
  const { have, total } = match.coverage;
  return have > 0 ? `${have}/${total} ingrédients en stock` : undefined;
};

export default function RecipesScreen() {
  const styles = useStyles();
  // Recettes choisies d’après le lieu affiché : on cuisine avec ce qu’on a sous la main.
  const activeProducts = usePlaceProducts();
  const { favorites, history } = useRecipeLog();
  const threshold = useSettings().settings.urgentThresholdDays;
  const today = useToday();
  // Grille : colonne large, plus de recettes par ligne sur tablette.
  const { wideGutter: gutter, wideContentWidth: contentWidth, gridColumns: columns } = useLayout();
  const { ref: scrollRef, scrollY, contentInsets, indicatorInsets } = useGlassScroll<Animated.ScrollView>(spacing.xxl * 2);
  const [filter, setFilter] = useState<RecipeFilter>('all');
  const [query, setQuery] = useState('');

  const ranked = useMemo(
    () => rankRecipes(RECIPES, activeProducts, parseLocalDate(today), threshold),
    [activeProducts, today, threshold],
  );
  const suggestions = useMemo(() => pickPriorityRecipes(ranked, MAX_SUGGESTIONS), [ranked]);
  const ready = useMemo(
    () => ranked.filter((match) => isReady(match) && !suggestions.includes(match)).slice(0, 6),
    [ranked, suggestions],
  );
  const recent = useMemo(() => {
    const ids = [...new Set(history.map((entry) => entry.recipeId))].slice(0, 6);
    return ids.map((id) => ranked.find((match) => match.recipe.id === id)).filter((m): m is RecipeMatch => !!m);
  }, [history, ranked]);

  const searching = query.trim() !== '';
  const visible = ranked.filter((match) => {
    if (!recipeMatchesQuery(match.recipe, query)) return false;
    switch (filter) {
      case 'ready':
        return isReady(match);
      case 'stock':
        return match.coverage.have > 0 || match.urgentProducts.length + match.otherProducts.length > 0;
      case 'favorites':
        return favorites.has(match.recipe.id);
      case 'quick':
        return match.recipe.durationMinutes <= 20;
      case 'vegetarien':
      case 'dessert':
        return match.recipe.tags.includes(filter);
      default:
        return true;
    }
  });

  const innerWidth = contentWidth - spacing.lg * 2;
  const tileWidth = (innerWidth - spacing.md * (columns - 1)) / columns;
  const featuredWidth = Math.min(280, innerWidth * 0.78);
  const smallWidth = Math.min(200, innerWidth * 0.55);

  const carousel = (matches: RecipeMatch[], width: number, highlight = false) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carousel}
      snapToInterval={width + spacing.md}
      decelerationRate="fast"
    >
      {matches.map((match) => (
        <RecipeTile
          key={match.recipe.id}
          recipe={match.recipe}
          width={width}
          caption={matchCaption(match)}
          highlight={highlight}
          favorite={favorites.has(match.recipe.id)}
        />
      ))}
    </ScrollView>
  );

  return (
    <View style={styles.screen}>
      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={[contentInsets, { paddingHorizontal: gutter }]}
        scrollIndicatorInsets={indicatorInsets}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <ScreenHeader title="Recettes" subtitle={`${RECIPES.length} idées simples pour cuisiner ce qui doit l’être.`} />
        <SearchBar value={query} onChangeText={setQuery} placeholder="Rechercher une recette ou un ingrédient" />

        {!searching ? (
          <>
            {suggestions.length > 0 ? (
              <>
                <SectionTitle title="À cuisiner en priorité" caption="Ces recettes sauvent vos produits qui périment bientôt." />
                {carousel(suggestions, featuredWidth, true)}
              </>
            ) : (
              <View style={styles.info}>
                <Text style={styles.infoText}>
                  Rien ne presse dans votre frigo. Les recettes sont classées selon ce que vous avez en stock.
                </Text>
              </View>
            )}

            {ready.length > 0 ? (
              <>
                <SectionTitle title="Prêtes à cuisiner" caption="Vous avez déjà tous les ingrédients indispensables." />
                {carousel(ready, smallWidth)}
              </>
            ) : null}

            {recent.length > 0 ? (
              <>
                <SectionTitle title="Cuisinées récemment" />
                {carousel(recent, smallWidth)}
              </>
            ) : null}
          </>
        ) : null}

        <SectionTitle title={searching ? 'Résultats' : 'Toutes les recettes'} caption={pluralize(visible.length, 'recette')} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          keyboardShouldPersistTaps="handled"
        >
          {FILTERS.map((f) => (
            <Chip
              key={f.value}
              size="sm"
              icon={f.icon}
              label={f.label}
              selected={filter === f.value}
              onPress={() => setFilter(f.value)}
            />
          ))}
        </ScrollView>

        {visible.length === 0 ? (
          <EmptyState
            compact
            icon={filter === 'favorites' ? 'heart-outline' : 'restaurant-outline'}
            title={filter === 'favorites' ? 'Aucun favori' : 'Aucune recette'}
            message={
              filter === 'favorites'
                ? 'Touchez le cœur d’une recette pour la retrouver ici.'
                : 'Aucune recette ne correspond pour l’instant. Essayez un autre filtre ou un autre mot.'
            }
          />
        ) : (
          <View style={styles.grid}>
            {visible.map((match) => (
              <RecipeTile
                key={match.recipe.id}
                recipe={match.recipe}
                width={tileWidth}
                caption={matchCaption(match)}
                favorite={favorites.has(match.recipe.id)}
              />
            ))}
          </View>
        )}
      </Animated.ScrollView>
      <GlassHeader title="Recettes" scrollY={scrollY} threshold={24} />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  screen: { flex: 1 },
  carousel: { gap: spacing.md, paddingRight: spacing.lg, paddingVertical: spacing.xs },
  info: { backgroundColor: colors.primarySoft, borderRadius: radius.lg, padding: spacing.lg, marginTop: spacing.lg },
  infoText: { fontSize: fontSize.body, color: colors.text, lineHeight: 22 },
  filters: { gap: spacing.sm, marginBottom: spacing.md, paddingRight: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
}));
