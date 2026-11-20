import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { expiryColors } from '@/components/ExpiryBadge';
import { FoodImage } from '@/components/FoodImage';
import { RecipeTile } from '@/components/recipes/RecipeTile';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { SettingsAction, SettingsDivider } from '@/components/ui/SettingsSection';
import { CATEGORIES, LOCATIONS } from '@/constants/catalog';
import { RECIPES } from '@/data/recipes';
import { useToast } from '@/features/feedback/ToastProvider';
import { MAIN_PLACE, placeOf } from '@/features/places/places';
import { usePlaces } from '@/features/places/PlacesProvider';
import { useProducts } from '@/features/products/ProductsProvider';
import {
  planFreeze,
  planOpen,
  planPartial,
  planThaw,
  productToInput,
  type SmartActionPlan,
} from '@/features/products/smartActions';
import { useProductActions } from '@/features/products/useProductActions';
import { productRelevance } from '@/features/recipes/recipeMatching';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useShopping } from '@/features/shopping/ShoppingProvider';
import { normalizeText } from '@/utils/text';
import { formatRemaining, REMAINING_OPTIONS } from '@/utils/remaining';
import { useModalTopInset } from '@/hooks/useModalTopInset';
import { useToday } from '@/hooks/useToday';
import { CHROME_FONT_SCALE, HEADING_FONT_SCALE, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { IconName } from '@/types/content';
import type { Product, ProductInput } from '@/types/product';
import { formatIsoAsShortDate, formatLongDate, formatLongDateCapitalized, formatShortDate, parseLocalDate } from '@/utils/date';
import { getExpiryInfo } from '@/utils/expiry';
import { haptics } from '@/utils/haptics';
import { formatEuros, isValidPrice } from '@/utils/price';
import { goBack } from '@/utils/navigation';
import { pastPurchases, type PastPurchases } from '@/utils/products';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, isLoading } = useProducts();
  const product = products.find((p) => p.id === id && p.status === 'active');

  if (!product) {
    if (isLoading) return null;
    return (
      <EmptyState
        icon="help-circle-outline"
        title="Produit introuvable"
        message="Ce produit a peut-être déjà été consommé, jeté ou supprimé."
        action={<Button label="Retour" onPress={goBack} />}
      />
    );
  }
  return <ProductDetail product={product} />;
}

const ACTION_MESSAGES: Record<SmartActionPlan['action'], (name: string, date: string) => string> = {
  freeze: (name, date) => `« ${name} » est au congélateur jusqu’au ${date}.`,
  thaw: (name, date) => `« ${name} » est au frigo : à consommer avant le ${date}.`,
  open: (name, date) => `« ${name} » entamé : à finir avant le ${date}.`,
  partial: (name, date) => `C’est noté pour « ${name} » : à finir avant le ${date}.`,
};

function ProductDetail({ product }: { product: Product }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const topInset = useModalTopInset();
  const today = useToday();
  const threshold = useSettings().settings.urgentThresholdDays;
  const { products, updateProduct } = useProducts();
  const { close, confirmDelete } = useProductActions();
  const { showToast } = useToast();
  const { items: shoppingItems, addItems } = useShopping();
  const onShoppingList = shoppingItems.some((item) => !item.checked && normalizeText(item.name) === normalizeText(product.name));
  // Confirmation affichée dans la fiche : un toast serait masqué par la fenêtre modale sur iOS.
  const [undo, setUndo] = useState<{ message: string; previous: ProductInput } | null>(null);

  const expiry = getExpiryInfo(product.expiresAt, parseLocalDate(today), threshold);
  const tone = expiryColors(colors, expiry.level);
  const category = CATEGORIES[product.category];
  const location = LOCATIONS[product.location];
  // Lieu affiché seulement s’il y en a plusieurs et que ce n’est pas la maison.
  const { places } = usePlaces();
  const placeId = placeOf(product, places);
  const place = placeId === MAIN_PLACE.id ? null : (places.find((p) => p.id === placeId) ?? null);

  const freezePlan = planFreeze(product, today);
  const thawPlan = planThaw(product, today);
  const openPlan = planOpen(product, today);

  const recipes = useMemo(
    () =>
      RECIPES.map((recipe) => ({ recipe, relevance: productRelevance(recipe, product) }))
        .filter((r) => r.relevance !== 'none')
        .sort((a, b) => (a.relevance === b.relevance ? 0 : a.relevance === 'ingredient' ? -1 : 1))
        .slice(0, 4),
    [product],
  );

  const past = useMemo(() => pastPurchases(products, product), [products, product]);

  const runPlan = async (plan: SmartActionPlan) => {
    const previous = productToInput(product);
    try {
      await updateProduct(product.id, plan.input);
      haptics.success();
      setUndo({ message: ACTION_MESSAGES[plan.action](product.name, formatShortDate(plan.newExpiresAt)), previous });
    } catch {
      showToast({ tone: 'error', message: 'La modification n’a pas pu être enregistrée.' });
    }
  };

  const revert = async () => {
    if (!undo) return;
    await updateProduct(product.id, undo.previous).catch(() => undefined);
    setUndo(null);
  };

  const askPartial = () => {
    Alert.alert('Combien en reste-t-il ?', 'Le bilan comptera seulement ce qui reste si le produit finit par être jeté.', [
      ...REMAINING_OPTIONS.filter((value) => value !== product.remaining).map((value) => ({
        text: `Il en reste ${formatRemaining(value)}`,
        onPress: () => void runPlan(planPartial(product, value, today)),
      })),
      { text: 'Annuler', style: 'cancel' as const },
    ]);
  };

  const addToShopping = () => {
    addItems([{ name: product.name, category: product.category, source: 'restock' }])
      .then(() => haptics.success())
      .catch(() => showToast({ tone: 'error', message: 'La liste de courses n’a pas pu être modifiée.' }));
  };

  const closeAndLeave = (status: 'consumed' | 'discarded') => {
    goBack();
    void close(product, status);
  };

  const countdown =
    expiry.days < 0
      ? { value: String(-expiry.days), unit: -expiry.days > 1 ? 'jours de retard' : 'jour de retard' }
      : expiry.days === 0
        ? { value: '0', unit: 'aujourd’hui' }
        : { value: String(expiry.days), unit: expiry.days > 1 ? 'jours restants' : 'jour restant' };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}>
        <View style={styles.hero}>
          <FoodImage
            name={product.name}
            category={product.category}
            uri={product.imageUri}
            style={styles.heroImage}
            radius={0}
            creditBottom={CREDIT_BOTTOM}
          />
          <LinearGradient colors={['rgba(0,0,0,0.35)', 'transparent']} style={styles.heroTopShade} pointerEvents="none" />
          <View style={[styles.heroActions, { top: spacing.md + topInset }]}>
            <IconButton
              icon="create-outline"
              label="Modifier"
              tone="onImage"
              size={40}
              onPress={() => router.push({ pathname: '/product/[id]/edit', params: { id: product.id } })}
            />
            <IconButton icon="close" label="Fermer" tone="onImage" size={40} onPress={goBack} />
          </View>
        </View>

        <View style={styles.sheet}>
          <Text maxFontSizeMultiplier={HEADING_FONT_SCALE} style={styles.name} accessibilityRole="header">
            {product.name}
          </Text>
          {product.brand ? <Text style={styles.brand}>{product.brand}</Text> : null}

          <View style={styles.tags}>
            {place ? <Tag icon={place.icon} label={place.name} /> : null}
            <Tag icon={location.icon} label={location.label} />
            <Tag icon={category.icon} label={category.label} />
            {product.quantity ? <Tag icon="cube-outline" label={product.quantity} /> : null}
            {product.openedAt ? <Tag icon="lock-open-outline" label={`Entamé le ${formatShortDate(product.openedAt)}`} /> : null}
            {product.remaining ? (
              <Tag icon="pie-chart-outline" label={`Il en reste ${formatRemaining(product.remaining)}`} />
            ) : null}
          </View>

          <View
            style={[styles.countdown, { backgroundColor: tone.bg }]}
            accessible
            accessibilityLabel={`${expiry.label}, ${formatLongDate(product.expiresAt)}`}
          >
            <View style={styles.countdownNumber}>
              <Text style={[styles.countdownValue, { color: tone.fg }]} maxFontSizeMultiplier={CHROME_FONT_SCALE}>
                {countdown.value}
              </Text>
              <Text style={[styles.countdownUnit, { color: tone.fg }]} maxFontSizeMultiplier={CHROME_FONT_SCALE}>
                {countdown.unit}
              </Text>
            </View>
            <View style={styles.countdownText}>
              <View style={styles.countdownLabelRow}>
                <Ionicons name={tone.icon} size={18} color={tone.fg} />
                <Text style={[styles.countdownLabel, { color: tone.fg }]}>{expiry.label}</Text>
              </View>
              <Text style={styles.countdownDate}>{formatLongDateCapitalized(product.expiresAt)}</Text>
            </View>
          </View>

          {undo ? (
            <View style={styles.undo} accessibilityLiveRegion="polite">
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.undoText}>{undo.message}</Text>
              <Button label="Annuler" size="sm" variant="ghost" onPress={() => void revert()} />
            </View>
          ) : null}

          <View style={styles.primaryActions}>
            <Button
              label="Consommé"
              icon="checkmark-circle"
              size="lg"
              style={styles.flex}
              onPress={() => closeAndLeave('consumed')}
            />
            <Button
              label="Jeté"
              icon="trash-outline"
              size="lg"
              variant="danger"
              style={styles.flex}
              onPress={() => closeAndLeave('discarded')}
            />
          </View>

          <Text style={styles.groupTitle}>Gestes anti-gaspi</Text>
          <View style={styles.group}>
            {freezePlan ? (
              <SettingsAction
                icon="snow-outline"
                label="Congeler maintenant"
                description={`Se garde jusqu’au ${formatShortDate(freezePlan.newExpiresAt)}`}
                onPress={() => void runPlan(freezePlan)}
              />
            ) : null}
            {thawPlan ? (
              <SettingsAction
                icon="thermometer-outline"
                label="Sortir du congélateur"
                description="Décongeler au frigo et consommer sous 24 h"
                onPress={() => void runPlan(thawPlan)}
              />
            ) : null}
            {openPlan ? (
              <>
                {freezePlan || thawPlan ? <SettingsDivider /> : null}
                <SettingsAction
                  icon="lock-open-outline"
                  label="Je l’ai entamé"
                  description={`Un produit ouvert se garde moins : à finir avant le ${formatShortDate(openPlan.newExpiresAt)}`}
                  onPress={() => void runPlan(openPlan)}
                />
              </>
            ) : null}
            {freezePlan || thawPlan || openPlan ? <SettingsDivider /> : null}
            <SettingsAction
              icon="pie-chart-outline"
              label="J’en ai utilisé une partie"
              description={
                product.remaining
                  ? `Il en reste ${formatRemaining(product.remaining)} : mettez à jour au fil de l’eau`
                  : 'Indiquez ce qu’il reste pour un bilan plus juste'
              }
              onPress={askPartial}
            />
            {expiry.days < 0 ? (
              <Text style={styles.noAction}>
                La date est dépassée : vérifiez l’aspect et l’odeur avant de consommer (voir Conseils).
              </Text>
            ) : null}
          </View>

          <View style={[styles.group, styles.shopping]}>
            <SettingsAction
              icon={onShoppingList ? 'checkmark-circle' : 'cart-outline'}
              label={onShoppingList ? 'Sur la liste de courses' : 'Ajouter à la liste de courses'}
              description={onShoppingList ? 'À retrouver dans l’onglet Courses' : 'Pour penser à le racheter'}
              trailing={onShoppingList ? <View /> : undefined}
              onPress={onShoppingList ? () => undefined : addToShopping}
            />
          </View>

          {recipes.length > 0 ? (
            <>
              <Text style={styles.groupTitle}>Idées pour le cuisiner</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recipes}>
                {recipes.map(({ recipe }) => (
                  <RecipeTile key={recipe.id} recipe={recipe} width={200} />
                ))}
              </ScrollView>
            </>
          ) : null}

          {past ? (
            <>
              <Text style={styles.groupTitle}>Vos achats précédents</Text>
              <View style={[styles.group, styles.details]}>
                <Text style={styles.pastSummary}>{describePast(past)}</Text>
                {past.recent.map((purchase) => (
                  <Detail
                    key={purchase.id}
                    label={`${purchase.status === 'consumed' ? 'Consommé' : 'Jeté'} le ${formatIsoAsShortDate(purchase.closedAt)}`}
                    value={[purchase.price !== undefined ? formatEuros(purchase.price) : null, formatKept(purchase.keptDays)]
                      .filter(Boolean)
                      .join(' · ')}
                  />
                ))}
              </View>
            </>
          ) : null}

          <Text style={styles.groupTitle}>Détails</Text>
          <View style={[styles.group, styles.details]}>
            <Detail label="Prix" value={isValidPrice(product.price) ? formatEuros(product.price) : '—'} />
            <Detail label="Ajouté le" value={formatIsoAsShortDate(product.addedAt)} />
            {product.barcode ? <Detail label="Code-barres" value={product.barcode} /> : null}
            {product.source === 'open_food_facts' ? <Detail label="Source" value="Open Food Facts" /> : null}
            {product.notes ? <Detail label="Notes" value={product.notes} /> : null}
          </View>

          <View style={styles.footer}>
            <Button
              label="Modifier"
              icon="create-outline"
              variant="secondary"
              style={styles.flex}
              onPress={() => router.push({ pathname: '/product/[id]/edit', params: { id: product.id } })}
            />
            <Button
              label="Supprimer"
              icon="close-circle-outline"
              variant="ghost"
              style={styles.flex}
              onPress={() => void confirmDelete(product, goBack)}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const formatKept = (days: number) => (days === 0 ? 'le jour même' : days === 1 ? 'gardé 1 jour' : `gardé ${days} jours`);

/** « 4 achats, 2,50 € en moyenne, gardé 6 jours. 1 jeté sur 4. » */
function describePast(past: PastPurchases): string {
  const parts = [past.count === 1 ? 'Acheté une fois' : `Acheté ${past.count} fois`];
  if (past.averagePrice !== undefined) parts.push(`${formatEuros(past.averagePrice)}${past.count > 1 ? ' en moyenne' : ''}`);
  if (past.count > 1)
    parts.push(
      past.keptDays === 0 ? 'fini le jour même' : `gardé ${past.keptDays} jour${past.keptDays > 1 ? 's' : ''} d’habitude`,
    );
  const waste = past.discarded > 0 ? ` Jeté ${past.discarded} fois sur ${past.count}.` : '';
  return `${parts.join(', ')}.${waste}`;
}

function Tag({ icon, label }: { icon: IconName; label: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.tag}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const HERO_HEIGHT = 250;
/** Le crédit photo reste visible au-dessus de la feuille arrondie qui recouvre le bas de la photo. */
const CREDIT_BOTTOM = radius.xxl + spacing.sm;

const useStyles = makeStyles(({ colors }) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  hero: { height: HERO_HEIGHT },
  heroImage: { width: '100%', height: HERO_HEIGHT },
  heroTopShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 90 },
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
  name: { fontSize: fontSize.heading, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  brand: { fontSize: fontSize.body, color: colors.textMuted, marginTop: 2 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  tag: {
    flexDirection: 'row',
    maxWidth: '100%',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  tagText: { flexShrink: 1, fontSize: fontSize.caption, fontWeight: '600', color: colors.text },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xl,
  },
  countdownNumber: { alignItems: 'center', minWidth: 72 },
  countdownValue: { fontSize: 44, fontWeight: '800', letterSpacing: -1, lineHeight: 48 },
  countdownUnit: { fontSize: fontSize.micro + 1, fontWeight: '700', textAlign: 'center' },
  countdownText: { flex: 1, gap: 4 },
  countdownLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  // flex : le libellé passe à la ligne entre les mots, même en très grand texte.
  countdownLabel: { flex: 1, fontSize: fontSize.bodyLarge, fontWeight: '800' },
  countdownDate: { fontSize: fontSize.body, color: colors.text },
  primaryActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
  },
  undoText: { flex: 1, fontSize: fontSize.caption + 1, fontWeight: '600', color: colors.text },
  groupTitle: {
    fontSize: fontSize.caption,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  group: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  shopping: { marginTop: spacing.md },
  pastSummary: { paddingVertical: spacing.md, fontSize: fontSize.body, lineHeight: 21, color: colors.text },
  noAction: { padding: spacing.lg, fontSize: fontSize.body, color: colors.textMuted, lineHeight: 21 },
  recipes: { gap: spacing.md, paddingRight: spacing.lg },
  details: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xs },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  detailLabel: { fontSize: fontSize.body, color: colors.textMuted },
  detailValue: { flex: 1, textAlign: 'right', fontSize: fontSize.body, fontWeight: '600', color: colors.text },
  footer: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
}));
