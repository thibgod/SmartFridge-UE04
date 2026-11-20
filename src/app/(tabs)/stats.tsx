import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';

import { BadgesCard } from '@/components/charts/BadgesCard';
import { CategoryWasteList } from '@/components/charts/CategoryWasteList';
import { ImpactCard } from '@/components/charts/ImpactCard';
import { KpiCard, type KpiDelta } from '@/components/charts/KpiCard';
import { MonthlyChart } from '@/components/charts/MonthlyChart';
import { ScoreCard } from '@/components/charts/ScoreCard';
import { EmptyState } from '@/components/EmptyState';
import { HistoryItem } from '@/components/HistoryItem';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Screen, ScreenHeader, SectionTitle } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CATEGORIES } from '@/constants/catalog';
import { WASTE_ADVICE } from '@/data/wasteAdvice';
import { computeAchievements } from '@/features/achievements/achievements';
import { useToast } from '@/features/feedback/ToastProvider';
import { usePremium } from '@/features/premium/PremiumProvider';
import { exportHistoryCsv, exportReportPdf } from '@/services/backup/files';
import { useProducts } from '@/features/products/ProductsProvider';
import { useRecipeLog } from '@/features/recipes/RecipeLogProvider';
import { useLayout } from '@/hooks/useLayout';
import { useToday } from '@/hooks/useToday';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { Product } from '@/types/product';
import { parseLocalDate } from '@/utils/date';
import { computeImpact } from '@/utils/impact';
import { formatCents } from '@/utils/price';
import { pluralize } from '@/utils/text';
import {
  antiWasteScore,
  comparePeriods,
  filterClosedByPeriod,
  monthlyAmounts,
  monthlyBreakdown,
  repeatedlyDiscarded,
  selectHistory,
  wasteByCategory,
  type StatsPeriod,
} from '@/utils/stats';

type HistoryFilter = 'all' | 'consumed' | 'discarded';

const PAGE_SIZE = 25;

const signed = (value: number, format: (v: number) => string) => `${value > 0 ? '+' : '−'}${format(Math.abs(value))}`;

export default function StatsScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { gutter } = useLayout();
  const { products, deleteProduct } = useProducts();
  const { showToast } = useToast();
  const { history: cookedHistory } = useRecipeLog();
  const today = useToday();
  const [chosenPeriod, setPeriod] = useState<StatsPeriod>('30d');
  const { isPremium, showPaywall } = usePremium();
  const [exporting, setExporting] = useState(false);

  // Export de tout l’historique (pas seulement la période affichée) : c’est ce qu’on veut archiver.
  const runExport = async (format: 'pdf' | 'csv') => {
    setExporting(true);
    try {
      await (format === 'pdf' ? exportReportPdf(products) : exportHistoryCsv(products));
    } catch (error) {
      showToast({ tone: 'error', message: error instanceof Error && error.message ? error.message : 'L’export a échoué.' });
    } finally {
      setExporting(false);
    }
  };

  const onExport = () => {
    if (!isPremium) {
      showPaywall('stats');
      return;
    }
    Alert.alert('Exporter le Bilan', undefined, [
      { text: 'Rapport PDF', onPress: () => void runExport('pdf') },
      { text: 'Tableau (Excel, Numbers…)', onPress: () => void runExport('csv') },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };
  // Version gratuite : les montants des 30 derniers jours ; le reste du Bilan est Premium.
  const period: StatsPeriod = isPremium ? chosenPeriod : '30d';
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const data = useMemo(() => {
    // Basé sur la date du jour : recalculé quand l’app est rouverte un autre jour.
    const now = parseLocalDate(today);
    now.setHours(23, 59, 59);
    const inPeriod = filterClosedByPeriod(products, period, now);
    const { current, previous } = comparePeriods(products, period, now);
    const repeated = repeatedlyDiscarded(inPeriod);
    const categories = wasteByCategory(inPeriod);
    return {
      hasAnyHistory: products.some((p) => p.status !== 'active'),
      current,
      previous,
      score: antiWasteScore(current),
      previousScore: previous ? antiWasteScore(previous) : null,
      history: selectHistory(inPeriod),
      categories,
      repeated,
      months: monthlyBreakdown(products, 6, now),
      amounts: monthlyAmounts(products, 6, now),
      impact: computeImpact(inPeriod),
      achievements: computeAchievements(products, cookedHistory, now),
    };
  }, [products, period, today, cookedHistory]);

  const delta = (current: number, previous: number | undefined, format: (v: number) => string, goodWhen: KpiDelta['goodWhen']) =>
    previous === undefined ? null : { value: current - previous, label: signed(current - previous, format), goodWhen };

  const history = data.history.filter((p) => historyFilter === 'all' || p.status === historyFilter);

  const openHistoryActions = useCallback(
    (product: Product) => {
      Alert.alert(product.name, undefined, [
        { text: 'Racheter', onPress: () => router.push({ pathname: '/product/new', params: { copyFrom: product.id } }) },
        {
          text: 'Retirer de l’historique',
          style: 'destructive',
          onPress: () => {
            deleteProduct(product.id)
              .then(() => showToast({ tone: 'neutral', message: `« ${product.name} » a été retiré de l’historique.` }))
              .catch(() => showToast({ tone: 'error', message: 'La suppression a échoué.' }));
          },
        },
        { text: 'Annuler', style: 'cancel' },
      ]);
    },
    [deleteProduct, showToast],
  );

  const { current, previous } = data;
  const insight = data.repeated[0]
    ? `Vous avez jeté « ${data.repeated[0].name} » ${data.repeated[0].count} fois. ${WASTE_ADVICE[data.repeated[0].category]}`
    : data.categories[0]
      ? `${CATEGORIES[data.categories[0].category].label} : ${WASTE_ADVICE[data.categories[0].category]}`
      : null;

  const header = (
    <View>
      <ScreenHeader title="Bilan" subtitle="Votre impact anti-gaspi, en un coup d’œil." />
      {data.hasAnyHistory ? (
        <View style={styles.block}>
          {isPremium ? (
            <SegmentedControl
              segments={[
                { value: '30d', label: '30 jours' },
                { value: '6m', label: '6 mois' },
                { value: 'all', label: 'Tout' },
              ]}
              value={period}
              onChange={(value) => {
                setPeriod(value);
                setLimit(PAGE_SIZE);
              }}
            />
          ) : null}

          {current.closedCount > 0 && data.score !== null ? (
            <>
              {isPremium ? (
                <ScoreCard
                  score={data.score}
                  previous={data.previousScore}
                  consumed={current.consumedCount}
                  closed={current.closedCount}
                />
              ) : null}
              <View style={styles.grid}>
                <KpiCard
                  label="Économisés"
                  value={formatCents(current.savedCents)}
                  icon="wallet-outline"
                  accent={{ fg: colors.success, bg: colors.successSoft }}
                  delta={delta(current.savedCents, previous?.savedCents, formatCents, 'up')}
                  caption={pluralize(current.consumedCount, 'produit consommé', 'produits consommés')}
                />
                <KpiCard
                  label="Perdus"
                  value={formatCents(current.lostCents)}
                  icon="cash-outline"
                  accent={{ fg: colors.danger, bg: colors.dangerSoft }}
                  delta={delta(current.lostCents, previous?.lostCents, formatCents, 'down')}
                  caption={pluralize(current.discardedCount, 'produit jeté', 'produits jetés')}
                />
              </View>
              {current.unpricedCount > 0 ? (
                <Text style={styles.note}>
                  {current.unpricedCount} produit{current.unpricedCount > 1 ? 's' : ''} sans prix{' '}
                  {current.unpricedCount > 1 ? 'ne sont pas comptés' : 'n’est pas compté'} dans les montants.
                </Text>
              ) : null}
            </>
          ) : (
            <View style={styles.periodEmpty}>
              <Text style={styles.periodEmptyText}>Aucun produit consommé ou jeté sur cette période.</Text>
            </View>
          )}

          {!isPremium ? <PremiumStatsTeaser onPress={() => showPaywall('stats')} /> : null}

          {isPremium && data.impact.savedKg > 0 ? <ImpactCard impact={data.impact} /> : null}

          {insight ? (
            <View style={styles.insight}>
              <View style={styles.insightIcon}>
                <Ionicons name="bulb" size={20} color={colors.warning} />
              </View>
              <View style={styles.insightText}>
                <Text style={styles.insightTitle}>Conseil pour vous</Text>
                <Text style={styles.insightBody}>{insight}</Text>
              </View>
            </View>
          ) : null}

          {isPremium ? (
            <>
              <SectionTitle title="Vos badges" caption="Depuis le début, toutes périodes confondues." />
              <BadgesCard achievements={data.achievements} />

              <MonthlyChart months={data.months} amounts={data.amounts} />
              <CategoryWasteList items={data.categories} />
            </>
          ) : null}

          {data.history.length > 0 ? (
            <>
              <SectionTitle
                title="Historique"
                caption="Touchez un produit pour le racheter ou le retirer."
                action={
                  <Button
                    label="Exporter"
                    icon={isPremium ? 'download-outline' : 'lock-closed-outline'}
                    size="sm"
                    variant="ghost"
                    loading={exporting}
                    accessibilityHint="Rapport PDF ou tableau de l’historique"
                    onPress={onExport}
                  />
                }
              />
              <View style={styles.filters}>
                <Chip size="sm" label="Tous" selected={historyFilter === 'all'} onPress={() => setHistoryFilter('all')} />
                <Chip
                  size="sm"
                  label="Consommés"
                  selected={historyFilter === 'consumed'}
                  onPress={() => setHistoryFilter('consumed')}
                />
                <Chip
                  size="sm"
                  label="Jetés"
                  selected={historyFilter === 'discarded'}
                  onPress={() => setHistoryFilter('discarded')}
                />
              </View>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen>
      <FlatList<Product>
        data={history.slice(0, limit)}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.historyRow,
              index === 0 && styles.historyFirst,
              index === Math.min(limit, history.length) - 1 && styles.historyLast,
            ]}
          >
            <HistoryItem product={item} onPress={openHistoryActions} />
          </View>
        )}
        ListHeaderComponent={header}
        ListFooterComponent={
          history.length > limit ? (
            <Button
              label={`Afficher plus (${history.length - limit})`}
              variant="ghost"
              onPress={() => setLimit((n) => n + PAGE_SIZE)}
              style={styles.more}
            />
          ) : null
        }
        ListEmptyComponent={
          data.hasAnyHistory ? null : (
            <EmptyState
              icon="bar-chart-outline"
              title="Pas encore de bilan"
              message="Marquez vos produits comme « Consommé » ou « Jeté » : votre score anti-gaspi et vos économies apparaîtront ici."
            />
          )
        }
        contentContainerStyle={[styles.list, { paddingHorizontal: gutter }]}
      />
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  list: { paddingBottom: spacing.xxl * 2 },
  block: { gap: spacing.md, marginTop: spacing.sm },
  teaser: {
    gap: spacing.sm + 2,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
  },
  teaserHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  teaserTitle: { flex: 1, fontSize: fontSize.bodyLarge, fontWeight: '800', color: colors.text },
  teaserRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  teaserText: { flex: 1, fontSize: fontSize.body, color: colors.text },
  grid: { flexDirection: 'row', gap: spacing.md },
  note: { fontSize: fontSize.caption, color: colors.textMuted, marginTop: -spacing.xs },
  periodEmpty: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  periodEmptyText: { fontSize: fontSize.body, color: colors.textMuted },
  insight: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.warningSoft,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: { flex: 1, gap: 3 },
  insightTitle: { fontSize: fontSize.body, fontWeight: '800', color: colors.text },
  insightBody: { fontSize: fontSize.body, color: colors.text, lineHeight: 21 },
  filters: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  historyRow: {
    backgroundColor: colors.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  historyFirst: { borderTopWidth: 1, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  historyLast: { borderBottomWidth: 1, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  more: { marginTop: spacing.sm },
}));

const TEASER_ITEMS: readonly {
  icon: 'trophy-outline' | 'leaf-outline' | 'bar-chart-outline' | 'ribbon-outline' | 'time-outline';
  text: string;
}[] = [
  { icon: 'trophy-outline', text: 'Score anti-gaspi et son évolution' },
  { icon: 'leaf-outline', text: 'Nourriture sauvée et CO₂ évité' },
  { icon: 'bar-chart-outline', text: 'Graphiques par mois et par catégorie' },
  { icon: 'ribbon-outline', text: 'Badges à débloquer' },
  { icon: 'time-outline', text: 'Bilans sur 6 mois et depuis le début' },
];

/** Version gratuite : ce que contient le Bilan complet, à un toucher de l’offre Premium. */
function PremiumStatsTeaser({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.teaser}>
      <View style={styles.teaserHeader}>
        <Ionicons name="sparkles" size={18} color={colors.primary} />
        <Text style={styles.teaserTitle}>Le Bilan complet avec Premium</Text>
      </View>
      {TEASER_ITEMS.map((item) => (
        <View key={item.text} style={styles.teaserRow}>
          <Ionicons name={item.icon} size={17} color={colors.primary} />
          <Text style={styles.teaserText}>{item.text}</Text>
        </View>
      ))}
      <Button label="Découvrir Premium" icon="sparkles-outline" onPress={onPress} />
    </View>
  );
}
