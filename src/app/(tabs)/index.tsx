import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { EmptyState } from '@/components/EmptyState';
import { PeekingFridgeMascot } from '@/components/FridgeMascot';
import { mostPressing } from '@/features/mascot/mascotLines';
import { GlassButton, GlassHeader, GlassHeaderSpacer, GlassSegmentedControl, useGlassScroll } from '@/components/glass';
import { LotRow } from '@/components/home/LotRow';
import { ProductRow } from '@/components/home/ProductRow';
import { SwipeHint } from '@/components/home/SwipeHint';
import { TonightCard } from '@/components/home/TonightCard';
import { UrgencySummary } from '@/components/home/UrgencySummary';
import { SearchBar } from '@/components/SearchBar';
import { Button } from '@/components/ui/Button';
import { Fab } from '@/components/ui/Fab';
import { ScreenHeader } from '@/components/ui/Screen';
import type { Segment } from '@/components/ui/SegmentedControl';
import { LOCATION_ORDER, LOCATIONS } from '@/constants/catalog';
import { expiryColors } from '@/components/ExpiryBadge';
import { MAIN_PLACE } from '@/features/places/places';
import { usePlaces } from '@/features/places/PlacesProvider';
import { useProducts } from '@/features/products/ProductsProvider';
import { useProductActions } from '@/features/products/useProductActions';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useInventory } from '@/hooks/useInventory';
import { useLayout } from '@/hooks/useLayout';
import { CHROME_FONT_SCALE, PRESSED, fontSize, makeStyles, spacing, useTheme, radius } from '@/theme';
import type { ClosedProductStatus, LocationFilter, Product } from '@/types/product';
import { haptics } from '@/utils/haptics';
import { bundleLots, type ProductGroup } from '@/utils/products';
import { formatLongDateCapitalized, parseLocalDate } from '@/utils/date';
import type { ExpiryLevel } from '@/utils/expiry';
import { SIDE_PANE_WIDTH } from '@/utils/layout';

const SECTION_TITLES: Record<ExpiryLevel, string> = {
  expired: 'Périmés',
  urgent: 'À consommer vite',
  ok: 'Plus tard',
};

/** En dessous, la recherche n’apporte rien : tout tient à l’écran. */
const SEARCH_MIN_PRODUCTS = 6;

/**
 * Les sections sont aplaties en une seule liste : c’est ce qui permet d’animer les sorties
 * (une ligne consommée s’efface et les suivantes remontent) avec `itemLayoutAnimation`.
 */
type FridgeRow =
  | { kind: 'header'; key: string; level: ExpiryLevel; count: number }
  | { kind: 'product'; key: string; group: ProductGroup; expanded: boolean }
  | { kind: 'lot'; key: string; product: Product; count: number };

const ROW_TRANSITION = LinearTransition.duration(260);

export default function FridgeScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  // Tablette à l’horizontale : résumé et filtres à gauche, liste des produits à droite.
  const { gutter, wideGutter, twoPane } = useLayout();
  // Défilement lu sur le fil d’interface : l’en-tête en verre apparaît et la barre du bas se réduit sans
  // repasser par React à chaque image. 120 pt de plus en bas : la place du bouton « Ajouter ».
  const { ref: scrollRef, scrollY, contentInsets, indicatorInsets } = useGlassScroll<Animated.FlatList<FridgeRow>>(120);
  const { isLoading, loadError, reload } = useProducts();
  const { settings, updateSettings } = useSettings();
  const { close } = useProductActions();
  const inventory = useInventory();

  // Présentation au premier lancement (une seule fois par montage).
  const onboardingShown = useRef(false);
  useEffect(() => {
    if (settings.onboardingDone || onboardingShown.current) return;
    onboardingShown.current = true;
    router.push('/onboarding');
  }, [settings.onboardingDone]);

  const openProduct = useCallback((product: Product) => {
    router.push({ pathname: '/product/[id]', params: { id: product.id } });
  }, []);

  // Produits regroupés (plusieurs lots) : toucher la ligne affiche ou masque ses lots.
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(() => new Set());
  const toggleGroup = useCallback((key: string) => {
    haptics.select();
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Nombre de lignes ouvertes par un balayage : le bouton « + » se retire pour ne pas couvrir « Jeté ».
  const [openRows, setOpenRows] = useState(0);
  const onSwipeChange = useCallback((open: boolean) => setOpenRows((n) => Math.max(0, n + (open ? 1 : -1))), []);

  // Le bouton « + » se replie en simple rond dès qu’on fait défiler la liste.
  const [atTop, setAtTop] = useState(true);
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const top = event.nativeEvent.contentOffset.y < 24;
    setAtTop((prev) => (prev === top ? prev : top));
  }, []);

  // Astuce du balayage : visible tant qu’elle n’est pas comprise ou que le geste n’a pas servi.
  const showSwipeHint = !settings.swipeHintSeen;
  const dismissSwipeHint = useCallback(() => void updateSettings({ swipeHintSeen: true }), [updateSettings]);
  const onCloseProduct = useCallback(
    (product: Product, status: ClosedProductStatus) => {
      if (!settings.swipeHintSeen) dismissSwipeHint();
      close(product, status);
    },
    [close, dismissSwipeHint, settings.swipeHintSeen],
  );

  const rows = useMemo<FridgeRow[]>(
    () =>
      inventory.sections.flatMap((section): FridgeRow[] => [
        { kind: 'header', key: `section-${section.level}`, level: section.level, count: section.groups.length },
        ...section.groups.flatMap((group): FridgeRow[] => {
          const expanded = group.lots.length > 1 && expandedGroups.has(group.key);
          return [
            { kind: 'product', key: group.key, group, expanded },
            ...(expanded
              ? bundleLots(group.lots).map((bundle): FridgeRow => ({
                  kind: 'lot',
                  key: `lot-${bundle[0]?.id}`,
                  product: bundle[0] as Product,
                  count: bundle.length,
                }))
              : []),
          ];
        }),
      ]),
    [inventory.sections, expandedGroups],
  );
  const demoId = showSwipeHint && !inventory.isFiltered ? rows.find((row) => row.kind === 'product')?.key : undefined;

  const renderItem = useCallback(
    ({ item }: { item: FridgeRow }) => {
      if (item.kind === 'product') {
        const [first] = item.group.lots;
        if (!first) return null;
        const grouped = item.group.lots.length > 1;
        return (
          <ProductRow
            product={first}
            urgentThreshold={inventory.threshold}
            onPress={grouped ? () => toggleGroup(item.group.key) : openProduct}
            onClose={onCloseProduct}
            onSwipeChange={onSwipeChange}
            demo={item.key === demoId}
            lotCount={item.group.lots.length}
            lastExpiresAt={item.group.lots.at(-1)?.expiresAt}
            expanded={item.expanded}
          />
        );
      }
      if (item.kind === 'lot') {
        return <LotRow product={item.product} count={item.count} urgentThreshold={inventory.threshold} onPress={openProduct} />;
      }
      const tone = expiryColors(colors, item.level);
      return (
        <View style={styles.sectionHeader} accessibilityRole="header">
          <View style={[styles.sectionDot, { backgroundColor: tone.fg }]} />
          <Text style={styles.sectionTitle}>{SECTION_TITLES[item.level]}</Text>
          <View style={[styles.sectionCount, { backgroundColor: tone.bg }]}>
            <Text style={[styles.sectionCountText, { color: tone.fg }]} maxFontSizeMultiplier={CHROME_FONT_SCALE}>
              {item.count}
            </Text>
          </View>
        </View>
      );
    },
    [inventory.threshold, openProduct, toggleGroup, onCloseProduct, onSwipeChange, demoId, colors, styles],
  );

  const locationSegments: Segment<LocationFilter>[] = [
    { value: 'all', label: 'Tout', count: inventory.locationCounts.all },
    ...LOCATION_ORDER.map((location) => ({
      value: location,
      label: LOCATIONS[location].shortLabel,
      count: inventory.locationCounts[location],
      accessibilityLabel: `${LOCATIONS[location].label}, ${inventory.locationCounts[location]} produits`,
    })),
  ];

  const hasProducts = inventory.totalCount > 0;
  // Ce que la mascotte peut dire : les compteurs et le produit le plus pressé.
  // Le plus pressé, périmé compris : « à consommer vite » ne contient pas les produits déjà périmés.
  // Recalculé aussi au changement de jour : « périme demain » devient « périme aujourd’hui ».
  const soonest = useMemo(
    () => mostPressing(inventory.placeProducts, parseLocalDate(inventory.today)),
    [inventory.placeProducts, inventory.today],
  );
  const mascotFridge = useMemo(
    () => ({
      total: inventory.totalCount,
      urgent: inventory.counts.urgent,
      expired: inventory.counts.expired,
      soonest,
    }),
    [inventory.totalCount, inventory.counts.urgent, inventory.counts.expired, soonest],
  );
  // Sélecteur de lieu : seulement quand il y a plusieurs lieux, l’accueil reste sinon inchangé.
  const { places, current } = usePlaces();
  const hasPlaces = places.length > 0;
  const title = hasPlaces && current.id !== MAIN_PLACE.id ? current.name : 'Mon frigo';
  const showPriority = inventory.priority.length > 0 && !inventory.isFiltered;
  const showSearch = inventory.totalCount >= SEARCH_MIN_PRODUCTS || inventory.query !== '';

  const header = (
    <View>
      <ScreenHeader
        eyebrow={formatLongDateCapitalized(inventory.today).replace(/ \d{4}$/, '')}
        title={title}
        subtitle={inventory.headline}
        right={<GlassHeaderSpacer count={2} />}
      />

      {hasPlaces ? (
        <Pressable
          onPress={() => router.push('/places')}
          accessibilityRole="button"
          accessibilityLabel={`Lieu affiché : ${current.name}`}
          accessibilityHint="Changer de lieu"
          style={({ pressed }) => [styles.placePill, pressed && PRESSED]}
        >
          <Ionicons name={current.icon} size={16} color={colors.primary} />
          <Text style={styles.placeText}>{current.name}</Text>
          <Ionicons name="chevron-down" size={15} color={colors.primary} />
        </Pressable>
      ) : null}

      {hasProducts ? (
        <View style={styles.block}>
          <UrgencySummary
            counts={inventory.counts}
            value={inventory.urgency}
            onChange={inventory.setUrgency}
            threshold={inventory.threshold}
          />
        </View>
      ) : null}

      {showPriority ? (
        <View style={styles.tonight}>
          <TonightCard products={inventory.placeProducts} today={inventory.today} threshold={inventory.threshold} />
        </View>
      ) : null}

      {hasProducts ? (
        <View style={[styles.block, styles.filters]}>
          {showSearch ? <SearchBar value={inventory.query} onChangeText={inventory.setQuery} /> : null}
          <GlassSegmentedControl segments={locationSegments} value={inventory.filter} onChange={inventory.setFilter} />
          {showSwipeHint && !inventory.isFiltered ? <SwipeHint onDismiss={dismissSwipeHint} /> : null}
          {inventory.isFiltered ? (
            <View style={styles.filterInfo}>
              <Text style={styles.filterText}>
                {inventory.visibleCount} résultat{inventory.visibleCount > 1 ? 's' : ''}
              </Text>
              <Pressable
                style={({ pressed }) => pressed && PRESSED}
                onPress={() => {
                  inventory.setQuery('');
                  inventory.setFilter('all');
                  inventory.setUrgency('all');
                }}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text style={styles.link}>Tout afficher</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const empty = isLoading ? (
    <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
  ) : loadError ? (
    <EmptyState
      icon="cloud-offline-outline"
      tone="error"
      title="Oups, un souci de lecture"
      message={loadError}
      action={<Button label="Réessayer" icon="refresh" onPress={reload} />}
    />
  ) : !hasProducts ? (
    <EmptyState
      icon="leaf-outline"
      title="Votre frigo est vide"
      message="Scannez un code-barres ou saisissez un produit : SmartFridge vous préviendra avant qu’il ne périme."
      action={
        <>
          <Button label="Scanner un produit" icon="barcode-outline" size="lg" onPress={() => router.push('/scan')} />
          <Button
            label="Photographier un ticket de caisse"
            icon="receipt-outline"
            variant="secondary"
            onPress={() => router.push('/receipt')}
          />
          <Button label="Saisir à la main" icon="create-outline" variant="ghost" onPress={() => router.push('/product/new')} />
        </>
      }
    />
  ) : (
    <EmptyState
      compact
      icon="search-outline"
      title="Aucun résultat"
      message="Aucun produit ne correspond à cette recherche ou à ces filtres."
    />
  );

  const list = (
    <Animated.FlatList
      ref={scrollRef}
      data={rows}
      keyExtractor={(item) => item.key}
      renderItem={renderItem}
      itemLayoutAnimation={ROW_TRANSITION}
      skipEnteringExitingAnimations
      extraData={`${inventory.today}-${inventory.threshold}`}
      ListHeaderComponent={twoPane ? undefined : header}
      ListEmptyComponent={empty}
      style={twoPane ? styles.mainPane : undefined}
      contentContainerStyle={[contentInsets, !twoPane && { paddingHorizontal: gutter }]}
      scrollIndicatorInsets={indicatorInsets}
      onScroll={onScroll}
      scrollEventThrottle={32}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    />
  );

  return (
    <View style={styles.screen}>
      {twoPane ? (
        <View style={[styles.panes, { paddingHorizontal: wideGutter }]}>
          <ScrollView
            style={styles.sidePane}
            contentContainerStyle={[styles.sideContent, contentInsets]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {header}
          </ScrollView>
          {list}
        </View>
      ) : (
        list
      )}
      {/* Barre du haut : boutons toujours à portée, titre compact et verre dès que la liste passe dessous. */}
      <GlassHeader
        title={title}
        scrollY={scrollY}
        threshold={32}
        wide={twoPane}
        right={
          <>
            <GlassButton icon="barcode-outline" iconOnly label="Scanner un code-barres" onPress={() => router.push('/scan')} />
            <GlassButton icon="settings-outline" iconOnly label="Réglages" onPress={() => router.push('/settings')} />
          </>
        }
      />
      <PeekingFridgeMascot fridge={mascotFridge} ready={!isLoading} scrolled={!atTop} rowOpen={openRows > 0} wide={twoPane} />
      {hasProducts ? (
        // Se retire en fondu pendant un balayage pour ne pas couvrir le panneau « Jeté ».
        <Fab
          label="Ajouter"
          icon="add"
          extended={atTop}
          visible={openRows === 0}
          wide={twoPane}
          onPress={() => router.push('/product/new')}
        />
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  screen: { flex: 1 },
  panes: { flex: 1, flexDirection: 'row', gap: spacing.xl },
  sidePane: { width: SIDE_PANE_WIDTH, flexGrow: 0 },
  sideContent: { paddingBottom: spacing.xxl * 2 },
  mainPane: { flex: 1 },
  tonight: { marginTop: spacing.md },
  placePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 2,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  placeText: { fontSize: fontSize.body, fontWeight: '700', color: colors.primary },
  block: { marginTop: spacing.md },
  filters: { gap: spacing.sm + 2, marginTop: spacing.lg },
  filterInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xs },
  filterText: { fontSize: fontSize.caption + 1, color: colors.textMuted },
  link: { fontSize: fontSize.body, fontWeight: '700', color: colors.primary },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.lg + 2,
    paddingBottom: spacing.sm,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: '800',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionCount: {
    minWidth: 26,
    paddingHorizontal: spacing.sm,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCountText: { fontSize: fontSize.caption, fontWeight: '800' },
  loader: { marginTop: spacing.xxl },
}));
