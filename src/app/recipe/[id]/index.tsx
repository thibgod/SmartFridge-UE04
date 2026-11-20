import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ExpiryBadge } from '@/components/ExpiryBadge';
import { FoodImage } from '@/components/FoodImage';
import { RecipeImage } from '@/components/recipes/RecipeImage';
import { ServingsStepper } from '@/components/recipes/ServingsStepper';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { RECIPE_TAGS } from '@/constants/recipes';
import { RECIPES } from '@/data/recipes';
import { useToast } from '@/features/feedback/ToastProvider';
import { isRecipeLocked } from '@/features/premium/limits';
import { usePremium } from '@/features/premium/PremiumProvider';
import { usePlaceProducts } from '@/features/places/usePlaceProducts';
import { formatIngredient, matchIngredient } from '@/features/recipes/recipeIngredients';
import { useCookRecipe } from '@/features/recipes/useCookRecipe';
import { useRecipeLog } from '@/features/recipes/RecipeLogProvider';
import { missingIngredients } from '@/features/shopping/shoppingLogic';
import { useShopping } from '@/features/shopping/ShoppingProvider';
import { useModalTopInset } from '@/hooks/useModalTopInset';
import { HEADING_FONT_SCALE, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { IconName, Recipe } from '@/types/content';
import { daysUntil, formatIsoAsShortDate } from '@/utils/date';
import { getExpiryInfo } from '@/utils/expiry';
import { haptics } from '@/utils/haptics';
import { pluralize } from '@/utils/text';
import { goBack } from '@/utils/navigation';

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = RECIPES.find((r) => r.id === id);
  if (!recipe) {
    return (
      <EmptyState
        icon="help-circle-outline"
        title="Recette introuvable"
        message="Cette recette n’existe plus."
        action={<Button label="Retour" onPress={goBack} />}
      />
    );
  }
  return <RecipeDetail recipe={recipe} />;
}

function RecipeDetail({ recipe }: { recipe: Recipe }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const topInset = useModalTopInset();
  const activeProducts = usePlaceProducts();
  const { items: shoppingItems, addItems } = useShopping();
  const { favorites, toggleFavorite, statsFor } = useRecipeLog();
  const { showToast } = useToast();
  const { usable, selected, toggle, cooked, threshold } = useCookRecipe(recipe);
  const { isPremium, showPaywall } = usePremium();
  // Recette Premium : photo, présentation et ingrédients restent visibles pour donner envie ;
  // la préparation, le mode cuisine et « J’ai cuisiné » demandent Premium.
  const locked = isRecipeLocked(recipe.id, isPremium);

  const [servings, setServings] = useState(recipe.servings);
  // Confirmations affichées dans la fiche : un toast serait masqué par la fenêtre modale sur iOS.
  const [notice, setNotice] = useState<string | null>(null);
  const favorite = favorites.has(recipe.id);
  const stats = statsFor(recipe.id);

  // « En stock » ne compte que les produits encore bons.
  const fresh = useMemo(() => activeProducts.filter((p) => daysUntil(p.expiresAt) >= 0), [activeProducts]);
  const rows = recipe.ingredients.map((ingredient) => ({
    ingredient,
    formatted: formatIngredient(ingredient, servings, recipe.servings),
    product: matchIngredient(ingredient, fresh),
  }));
  const required = rows.filter((row) => !row.ingredient.optional);
  const stockCount = required.filter((row) => row.product).length;
  const missing = useMemo(
    () => missingIngredients(recipe, activeProducts, shoppingItems, new Date(), servings),
    [recipe, activeProducts, shoppingItems, servings],
  );

  const fail = () => showToast({ tone: 'error', message: 'L’enregistrement a échoué. Réessayez.' });

  const onFavorite = () => {
    haptics.select();
    toggleFavorite(recipe.id).catch(fail);
  };

  const addMissing = async () => {
    try {
      const { added } = await addItems(missing.map(({ name, quantity }) => ({ name, quantity, source: 'recipe' as const })));
      haptics.success();
      setNotice(
        added.length > 0
          ? `${pluralize(added.length, 'ingrédient ajouté', 'ingrédients ajoutés')} à la liste de courses.`
          : 'Les ingrédients manquants sont déjà sur la liste.',
      );
    } catch {
      fail();
    }
  };

  const markCooked = async () => {
    try {
      const saved = await cooked();
      goBack();
      showToast({
        tone: 'success',
        message:
          saved > 0
            ? `Bravo ! ${pluralize(saved, 'produit sauvé', 'produits sauvés')} du gaspillage.`
            : 'Recette ajoutée à votre historique.',
      });
    } catch {
      fail();
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl * 3 }}>
        <View style={styles.hero}>
          <RecipeImage recipe={recipe} style={styles.heroImage} width={800} creditBottom={CREDIT_BOTTOM} />
          <LinearGradient colors={['rgba(0,0,0,0.35)', 'transparent']} style={styles.heroShade} pointerEvents="none" />
          <View style={[styles.heroActions, { top: spacing.md + topInset }]}>
            <IconButton
              icon={favorite ? 'heart' : 'heart-outline'}
              label={favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              tone="onImage"
              size={40}
              onPress={onFavorite}
            />
            <IconButton icon="close" label="Fermer" tone="onImage" size={40} onPress={goBack} />
          </View>
        </View>

        <View style={styles.sheet}>
          <Text maxFontSizeMultiplier={HEADING_FONT_SCALE} style={styles.title} accessibilityRole="header">
            {recipe.title}
          </Text>
          <Text style={styles.description}>{recipe.description}</Text>

          <View style={styles.meta}>
            <Meta icon="time-outline" text={`${recipe.durationMinutes} min`} />
            <Meta icon="speedometer-outline" text={recipe.difficulty === 'facile' ? 'Facile' : 'Moyen'} />
            <Meta icon="checkmark-done-outline" text={`${stockCount}/${required.length} en stock`} />
            {recipe.tags.map((tag) => (
              <Meta key={tag} icon={RECIPE_TAGS[tag].icon} text={RECIPE_TAGS[tag].label} />
            ))}
          </View>

          {stats.timesCooked > 0 ? (
            <View style={styles.history}>
              <Ionicons name="ribbon-outline" size={16} color={colors.primary} />
              <Text style={styles.historyText}>
                Cuisinée {stats.timesCooked === 1 ? 'une fois' : `${stats.timesCooked} fois`}
                {stats.lastCookedAt ? `, la dernière le ${formatIsoAsShortDate(stats.lastCookedAt)}` : ''}
              </Text>
            </View>
          ) : null}

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Ingrédients</Text>
            <ServingsStepper value={servings} onChange={setServings} />
          </View>
          <View style={styles.card}>
            {rows.map(({ ingredient, formatted, product }, index) => (
              <View key={`${ingredient.name}-${index}`} style={[styles.ingredient, index > 0 && styles.ingredientBorder]}>
                <Ionicons
                  name={product ? 'checkmark-circle' : ingredient.optional ? 'remove-circle-outline' : 'ellipse-outline'}
                  size={20}
                  color={product ? colors.success : colors.textSubtle}
                />
                <View style={styles.flex}>
                  <Text style={[styles.ingredientText, ingredient.optional && !product && styles.optional]}>
                    {formatted.amount ? <Text style={styles.amount}>{formatted.amount} </Text> : null}
                    {formatted.label}
                    {ingredient.optional ? <Text style={styles.optionalTag}> · facultatif</Text> : null}
                  </Text>
                  {product ? <Text style={styles.stock}>Vous avez : {product.name}</Text> : null}
                </View>
              </View>
            ))}
          </View>
          <Text style={styles.basics}>Prévoyez aussi sel, poivre et un peu d’huile ou de beurre.</Text>

          {missing.length > 0 ? (
            <Button
              label={`Ajouter ${pluralize(missing.length, 'ingrédient manquant', 'ingrédients manquants')} aux courses`}
              icon="cart-outline"
              variant="tonal"
              style={styles.block}
              onPress={() => void addMissing()}
            />
          ) : null}
          {notice ? (
            <View style={styles.notice} accessibilityLiveRegion="polite">
              <Ionicons name="cart" size={18} color={colors.success} />
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}

          {usable.length > 0 && !locked ? (
            <View style={styles.cookCard}>
              <Text style={styles.cookTitle}>Dans votre frigo</Text>
              <Text style={styles.cookHint}>Cochez ce que vous allez utiliser : ils seront marqués comme consommés.</Text>
              {usable.map((product) => {
                const checked = selected.has(product.id);
                const expiry = getExpiryInfo(product.expiresAt, new Date(), threshold);
                return (
                  <Pressable
                    key={product.id}
                    onPress={() => toggle(product.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    accessibilityLabel={`${product.name}, ${expiry.label}`}
                    style={styles.productRow}
                  >
                    <FoodImage
                      name={product.name}
                      category={product.category}
                      uri={product.imageUri}
                      size={40}
                      radius={radius.sm}
                    />
                    <View style={styles.productText}>
                      <Text style={styles.productName} numberOfLines={1}>
                        {product.name}
                      </Text>
                      <ExpiryBadge level={expiry.level} label={expiry.label} size="sm" />
                    </View>
                    <Ionicons
                      name={checked ? 'checkbox' : 'square-outline'}
                      size={26}
                      color={checked ? colors.primary : colors.textSubtle}
                    />
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Préparation</Text>
          {locked ? (
            <Pressable
              onPress={() => showPaywall('recipes')}
              accessibilityRole="button"
              accessibilityHint="Ouvre l’offre SmartFridge Premium"
              style={({ pressed }) => [styles.locked, pressed && styles.lockedPressed]}
            >
              <View style={styles.lockedIcon}>
                <Ionicons name="lock-closed" size={20} color={colors.onPrimary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.lockedTitle}>Recette Premium</Text>
                <Text style={styles.lockedText}>
                  {pluralize(recipe.steps.length, 'étape')} pas à pas, minuteurs et mode cuisine avec SmartFridge Premium.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </Pressable>
          ) : null}
          <View style={[styles.steps, locked && styles.hidden]}>
            {recipe.steps.map((step, index) => (
              <View key={step} style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

          {recipe.tip ? (
            <View style={styles.tip}>
              <Ionicons name="bulb-outline" size={20} color={colors.primary} />
              <Text style={styles.tipText}>{recipe.tip}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {locked ? (
          <Button
            label="Débloquer avec Premium"
            icon="sparkles-outline"
            style={styles.flex}
            onPress={() => showPaywall('recipes')}
          />
        ) : (
          <>
            <Button
              label="J’ai cuisiné"
              icon="checkmark-done"
              variant="secondary"
              style={styles.flex}
              onPress={() => void markCooked()}
              accessibilityHint={
                selected.size > 0
                  ? `${pluralize(selected.size, 'produit sera marqué', 'produits seront marqués')} consommé`
                  : undefined
              }
            />
            <Button
              label="Cuisiner"
              icon="play"
              style={styles.flex}
              onPress={() =>
                router.push({ pathname: '/recipe/[id]/cook', params: { id: recipe.id, servings: String(servings) } })
              }
            />
          </>
        )}
      </View>
    </View>
  );
}

function Meta({ icon, text }: { icon: IconName; text: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={15} color={colors.primary} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const HERO = 260;
/** Le crédit photo reste visible au-dessus de la feuille arrondie qui recouvre le bas de la photo. */
const CREDIT_BOTTOM = radius.xxl + spacing.sm;

const useStyles = makeStyles(({ colors }) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  hero: { height: HERO },
  heroImage: { width: '100%', height: HERO },
  heroShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 90 },
  heroActions: { position: 'absolute', right: spacing.md, flexDirection: 'row', gap: spacing.sm },
  sheet: {
    marginTop: -radius.xxl,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  title: { fontSize: fontSize.heading, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  hidden: { display: 'none' },
  locked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  lockedPressed: { opacity: 0.8 },
  lockedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  lockedTitle: { fontSize: fontSize.body, fontWeight: '800', color: colors.text },
  lockedText: { fontSize: fontSize.caption, lineHeight: 18, color: colors.textMuted, marginTop: 2 },
  description: { fontSize: fontSize.body, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 22 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  metaText: { fontSize: fontSize.caption, fontWeight: '700', color: colors.text },
  history: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, marginTop: spacing.md },
  historyText: { fontSize: fontSize.caption + 1, color: colors.textMuted, fontWeight: '600' },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ingredient: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md },
  ingredientBorder: { borderTopWidth: 1, borderTopColor: colors.surfaceMuted },
  ingredientText: { fontSize: fontSize.body, color: colors.text, lineHeight: 21 },
  amount: { fontWeight: '800' },
  optional: { color: colors.textMuted },
  optionalTag: { fontSize: fontSize.caption, color: colors.textSubtle },
  stock: { fontSize: fontSize.caption, fontWeight: '700', color: colors.success, marginTop: 2 },
  basics: { fontSize: fontSize.caption, color: colors.textSubtle, marginTop: spacing.sm, marginHorizontal: spacing.xs },
  block: { marginTop: spacing.md },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
  },
  noticeText: { flex: 1, fontSize: fontSize.caption + 1, fontWeight: '600', color: colors.text },
  cookCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  cookTitle: { fontSize: fontSize.bodyLarge, fontWeight: '800', color: colors.text },
  cookHint: { fontSize: fontSize.caption + 1, color: colors.textMuted, marginTop: -spacing.sm },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 48 },
  productText: { flex: 1, gap: 4 },
  productName: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  steps: { gap: spacing.lg },
  step: { flexDirection: 'row', gap: spacing.md },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { color: colors.onPrimary, fontWeight: '800', fontSize: fontSize.body },
  stepText: { flex: 1, fontSize: fontSize.body, color: colors.text, lineHeight: 23, paddingTop: 4 },
  tip: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  tipText: { flex: 1, fontSize: fontSize.body, color: colors.text, lineHeight: 22 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
}));
