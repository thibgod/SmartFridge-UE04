import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { useToast } from '@/features/feedback/ToastProvider';
import {
  asPremiumReason,
  FREE_PRODUCT_LIMIT,
  FREE_RECEIPTS_PER_MONTH,
  FREE_RECIPE_IDS,
  type PremiumReason,
} from '@/features/premium/limits';
import { PLANS, TRIAL_DAYS, type PlanId } from '@/features/premium/plans';
import { usePremium } from '@/features/premium/PremiumProvider';
import { RECIPES } from '@/data/recipes';
import { useModalTopInset } from '@/hooks/useModalTopInset';
import { HEADING_FONT_SCALE, PRESSED, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { IconName } from '@/types/content';
import { haptics } from '@/utils/haptics';
import { goBack } from '@/utils/navigation';

const LOCKED_RECIPES = RECIPES.length - FREE_RECIPE_IDS.size;

const REASON_TEXT: Record<PremiumReason, string> = {
  products: `Vous suivez déjà ${FREE_PRODUCT_LIMIT} produits, la limite de la version gratuite.`,
  recipes: `Cette recette fait partie des ${LOCKED_RECIPES} recettes Premium.`,
  receipt: `Vous avez lu vos ${FREE_RECEIPTS_PER_MONTH} tickets gratuits ce mois-ci.`,
  widget: 'Le widget d’écran d’accueil est inclus dans Premium.',
  stats: 'Le Bilan complet est inclus dans Premium.',
  settings: 'Tout SmartFridge, sans limite.',
};

const STORE_NAME = Platform.OS === 'ios' ? 'App Store' : 'Google Play';
const TERMS_URL =
  Platform.OS === 'ios'
    ? 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'
    : 'https://play.google.com/about/play-terms/';

interface Benefit {
  icon: IconName;
  title: string;
  detail: string;
}

const BENEFITS: readonly Benefit[] = [
  { icon: 'infinite-outline', title: 'Produits illimités', detail: `Au lieu de ${FREE_PRODUCT_LIMIT} en même temps` },
  { icon: 'restaurant-outline', title: `Les ${RECIPES.length} recettes`, detail: `Dont ${LOCKED_RECIPES} réservées à Premium` },
  { icon: 'receipt-outline', title: 'Tickets de caisse illimités', detail: `Au lieu de ${FREE_RECEIPTS_PER_MONTH} par mois` },
  { icon: 'apps-outline', title: 'Widget d’écran d’accueil', detail: 'Ce qui périme, sans ouvrir l’app' },
  { icon: 'stats-chart-outline', title: 'Bilan complet', detail: 'Score, impact CO₂, graphiques, badges et historique' },
  { icon: 'business-outline', title: 'Plusieurs frigos et lieux', detail: 'Bureau, résidence secondaire, cave…' },
  { icon: 'color-palette-outline', title: 'Couleurs et icônes au choix', detail: 'Océan, Framboise, Prune, Terracotta' },
  { icon: 'download-outline', title: 'Export du Bilan', detail: 'Rapport PDF ou tableau pour Excel, Numbers, Sheets' },
  { icon: 'cloud-done-outline', title: 'Sauvegarde automatique', detail: 'Une copie chaque jour, sans y penser' },
  { icon: 'people-outline', title: 'Partagé en famille', detail: 'Un seul abonnement pour tout le foyer' },
];

/** Offre SmartFridge Premium : jamais imposée, ouverte depuis une limite ou les réglages. */
export default function PremiumScreen() {
  const { reason: rawReason } = useLocalSearchParams<{ reason?: string }>();
  const reason = asPremiumReason(rawReason);
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const topInset = useModalTopInset();
  const { showToast } = useToast();
  const { isPremium, status, offers, activePlan, purchasing, purchase, restore, manage } = usePremium();
  const [selected, setSelected] = useState<PlanId>('yearly');
  const [message, setMessage] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const offer = offers.find((o) => o.id === selected);
  const plan = PLANS[selected];
  const canBuy = status === 'ready' && offer?.available === true;
  const trial = offer?.hasFreeTrial ?? true;

  const subscribe = async () => {
    setMessage(null);
    haptics.select();
    const outcome = await purchase(selected);
    if (outcome === 'success') {
      haptics.success();
      showToast({ tone: 'success', message: 'Bienvenue dans SmartFridge Premium !' });
      goBack();
    } else if (outcome === 'pending') {
      setMessage('Votre achat est en attente de validation. Premium s’activera dès qu’il sera confirmé.');
    } else if (outcome === 'error') {
      setMessage('L’achat n’a pas abouti. Aucun montant n’a été prélevé ; réessayez dans un instant.');
    } else if (outcome === 'unavailable') {
      setMessage(`Les achats ne sont pas disponibles pour le moment. Vérifiez votre connexion à l’${STORE_NAME}.`);
    }
  };

  const onRestore = async () => {
    setMessage(null);
    setRestoring(true);
    const restored = await restore();
    setRestoring(false);
    if (restored) {
      showToast({ tone: 'success', message: 'Abonnement Premium restauré.' });
      goBack();
    } else {
      setMessage(`Aucun abonnement actif n’a été trouvé pour ce compte ${STORE_NAME}.`);
    }
  };

  const ctaLabel = trial ? `Essayer gratuitement ${TRIAL_DAYS} jours` : 'S’abonner';
  const terms = trial
    ? `Essai gratuit de ${TRIAL_DAYS} jours, puis ${offer?.price ?? plan.fallbackPrice} ${plan.period}.`
    : `${offer?.price ?? plan.fallbackPrice} ${plan.period}.`;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: topInset + spacing.md, paddingBottom: spacing.xl }]}>
        <IconButton icon="close" label="Fermer" onPress={goBack} style={styles.close} />

        <View style={styles.badge}>
          <Ionicons name="sparkles" size={34} color={colors.onPrimary} />
        </View>
        <Text style={styles.title} accessibilityRole="header" maxFontSizeMultiplier={HEADING_FONT_SCALE}>
          SmartFridge Premium
        </Text>
        <Text style={styles.reason}>{isPremium ? 'Merci de soutenir SmartFridge !' : REASON_TEXT[reason]}</Text>

        <View style={styles.benefits}>
          {BENEFITS.map((benefit) => (
            <View key={benefit.title} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Ionicons name={benefit.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.benefitTitle}>{benefit.title}</Text>
                <Text style={styles.benefitDetail}>{benefit.detail}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            </View>
          ))}
        </View>

        {isPremium ? (
          <View style={styles.active}>
            <Ionicons name="checkmark-done-circle" size={22} color={colors.success} />
            <Text style={styles.activeText}>
              Premium est actif{activePlan ? ` (formule ${PLANS[activePlan].title.toLowerCase()})` : ''}.
            </Text>
          </View>
        ) : (
          <View style={styles.plans} accessibilityRole="radiogroup">
            {offers.map((o) => {
              const isSelected = o.id === selected;
              const definition = PLANS[o.id];
              return (
                <Pressable
                  key={o.id}
                  onPress={() => {
                    haptics.select();
                    setSelected(o.id);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={`${definition.title}, ${o.price} ${definition.period}${o.hasFreeTrial ? `, essai gratuit de ${TRIAL_DAYS} jours` : ''}`}
                  style={[styles.plan, isSelected && styles.planSelected]}
                >
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={isSelected ? colors.primary : colors.textSubtle}
                  />
                  <View style={styles.flex}>
                    <View style={styles.planTitleRow}>
                      <Text style={styles.planTitle}>{definition.title}</Text>
                      {o.id === 'yearly' ? (
                        <View style={styles.bestValue}>
                          <Text style={styles.bestValueText}>Le plus avantageux</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.planDetail}>
                      {o.id === 'yearly' ? `Soit ${o.monthlyEquivalent ?? '1,25 € par mois'}` : 'Sans engagement'}
                    </Text>
                  </View>
                  <View style={styles.planPrice}>
                    <Text style={styles.price}>{o.price}</Text>
                    <Text style={styles.period}>{definition.period}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {message ? (
          <Text style={styles.message} accessibilityLiveRegion="polite">
            {message}
          </Text>
        ) : null}
        {!isPremium && status === 'unavailable' ? (
          <Text style={styles.message}>
            {`Les achats ne sont pas disponibles sur cet appareil pour le moment (connexion à l’${STORE_NAME} impossible).`}
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {isPremium ? (
          <Button
            label="Gérer mon abonnement"
            icon="settings-outline"
            size="lg"
            variant="secondary"
            onPress={() => void manage()}
          />
        ) : (
          <>
            <Button
              label={ctaLabel}
              icon="sparkles-outline"
              size="lg"
              loading={purchasing !== null}
              disabled={!canBuy}
              onPress={() => void subscribe()}
            />
            <Text style={styles.terms}>
              {terms} Renouvellement automatique, résiliable à tout moment dans les réglages de votre compte {STORE_NAME}, au plus
              tard 24 heures avant la fin de la période en cours.
            </Text>
          </>
        )}
        <View style={styles.links}>
          {!isPremium ? (
            <Pressable
              style={({ pressed }) => pressed && PRESSED}
              onPress={() => void onRestore()}
              disabled={restoring}
              accessibilityRole="button"
              hitSlop={8}
            >
              <Text style={styles.link}>{restoring ? 'Restauration…' : 'Restaurer mes achats'}</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={({ pressed }) => pressed && PRESSED}
            onPress={() => void Linking.openURL(TERMS_URL).catch(() => undefined)}
            accessibilityRole="link"
            hitSlop={8}
          >
            <Text style={styles.link}>Conditions</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => pressed && PRESSED}
            onPress={() => router.push('/privacy')}
            accessibilityRole="link"
            hitSlop={8}
          >
            <Text style={styles.link}>Confidentialité</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, gap: spacing.md, width: '100%', maxWidth: 640, alignSelf: 'center' },
  close: { alignSelf: 'flex-end' },
  badge: {
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  title: { fontSize: fontSize.heading, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.4 },
  reason: { fontSize: fontSize.bodyLarge, lineHeight: 23, color: colors.textMuted, textAlign: 'center' },
  benefits: {
    marginTop: spacing.sm,
    padding: spacing.md,
    gap: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  benefitIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  benefitTitle: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  benefitDetail: { fontSize: fontSize.caption, color: colors.textMuted, marginTop: 1 },
  plans: { gap: spacing.sm, marginTop: spacing.sm },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  planSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  planTitle: { fontSize: fontSize.bodyLarge, fontWeight: '800', color: colors.text },
  bestValue: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.primary },
  bestValueText: { fontSize: fontSize.micro, fontWeight: '800', color: colors.onPrimary },
  planDetail: { fontSize: fontSize.caption, color: colors.textMuted, marginTop: 2 },
  planPrice: { alignItems: 'flex-end' },
  price: { fontSize: fontSize.bodyLarge, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  period: { fontSize: fontSize.caption, color: colors.textMuted },
  active: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.successSoft,
  },
  activeText: { flex: 1, fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  message: { fontSize: fontSize.body, lineHeight: 21, color: colors.danger, textAlign: 'center' },
  footer: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  terms: { fontSize: fontSize.micro + 1, lineHeight: 16, color: colors.textMuted, textAlign: 'center' },
  links: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, paddingTop: spacing.xs },
  link: { fontSize: fontSize.caption, fontWeight: '700', color: colors.primary },
}));
