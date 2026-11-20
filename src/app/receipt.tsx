import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { FoodImage } from '@/components/FoodImage';
import { Button } from '@/components/ui/Button';
import { LOCATIONS } from '@/constants/catalog';
import { useToast } from '@/features/feedback/ToastProvider';
import { FREE_RECEIPTS_PER_MONTH, remainingProductSlots } from '@/features/premium/limits';
import { MAIN_PLACE } from '@/features/places/places';
import { usePlaces } from '@/features/places/PlacesProvider';
import { usePremium } from '@/features/premium/PremiumProvider';
import { useProducts } from '@/features/products/ProductsProvider';
import {
  candidateExpiry,
  candidateToInput,
  coveredShoppingItems,
  nextLocation,
  toCandidates,
  type ReceiptCandidate,
} from '@/features/receipt/receiptItems';
import { parseReceipt } from '@/features/receipt/receiptParser';
import { useShopping } from '@/features/shopping/ShoppingProvider';
import { useToday } from '@/hooks/useToday';
import { pickPhoto, PhotoTextError, recognizeText } from '@/services/textRecognition';
import { MIN_TOUCH, PRESSED, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import { formatShortDate } from '@/utils/date';
import { haptics } from '@/utils/haptics';
import { formatEuros } from '@/utils/price';
import { pluralize } from '@/utils/text';
import { goBack } from '@/utils/navigation';

type Phase =
  | { status: 'idle'; error?: string }
  | { status: 'reading' }
  | { status: 'review'; candidates: ReceiptCandidate[] }
  | { status: 'empty' };

export default function ReceiptScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>({ status: 'idle' });
  const { isPremium, receiptsLeft, recordReceiptScan, showPaywall } = usePremium();

  const read = async (source: 'camera' | 'library') => {
    try {
      const uri = await pickPhoto(source);
      if (!uri) return;
      setPhase({ status: 'reading' });
      const candidates = toCandidates(parseReceipt(await recognizeText(uri)));
      if (candidates.length === 0) {
        setPhase({ status: 'empty' });
        return;
      }
      haptics.success();
      // Seule une lecture réussie compte dans le quota gratuit : une photo floue ne coûte rien.
      if (!isPremium) void recordReceiptScan().catch(() => undefined);
      setPhase({ status: 'review', candidates });
    } catch (error) {
      setPhase({
        status: 'idle',
        error: error instanceof PhotoTextError ? error.message : 'La photo n’a pas pu être lue. Réessayez.',
      });
    }
  };

  if (phase.status === 'review') {
    return <ReceiptReview initial={phase.candidates} onRetry={() => setPhase({ status: 'idle' })} />;
  }

  if (receiptsLeft === 0 && phase.status !== 'reading') {
    return (
      <ScrollView contentContainerStyle={[styles.intro, { paddingBottom: insets.bottom + spacing.xl }]}>
        <EmptyState
          icon="receipt-outline"
          title={`${FREE_RECEIPTS_PER_MONTH} tickets lus ce mois-ci`}
          message="C’est le maximum de la version gratuite ; le compteur repart à zéro le mois prochain. Avec Premium, lisez autant de tickets que vous voulez."
          action={
            <>
              <Button label="Découvrir Premium" icon="sparkles-outline" size="lg" onPress={() => showPaywall('receipt')} />
              <Button
                label="Saisir à la main"
                icon="create-outline"
                variant="ghost"
                onPress={() => router.replace('/product/new')}
              />
            </>
          }
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.intro, { paddingBottom: insets.bottom + spacing.xl }]}>
      {phase.status === 'reading' ? (
        <View style={styles.reading} accessibilityLiveRegion="polite">
          <ActivityIndicator size="large" />
          <Text style={styles.readingText}>Lecture du ticket…</Text>
        </View>
      ) : phase.status === 'empty' ? (
        <EmptyState
          icon="receipt-outline"
          title="Aucun produit trouvé"
          message="Le texte du ticket n’a pas pu être lu. Prenez la photo bien à plat, de près et sous une bonne lumière."
        />
      ) : (
        <EmptyState
          icon="receipt-outline"
          title="Ajoutez tout un ticket"
          message="Photographiez votre ticket de caisse : SmartFridge repère les produits, vous cochez ce qui va au frigo, et c’est rangé en un geste."
        />
      )}

      {phase.status === 'idle' && phase.error ? (
        <View style={styles.error} accessibilityRole="alert">
          <Ionicons name="alert-circle" size={18} style={styles.errorIcon} />
          <Text style={styles.errorText}>{phase.error}</Text>
        </View>
      ) : null}

      {phase.status !== 'reading' ? (
        <View style={styles.actions}>
          <Button label="Photographier le ticket" icon="camera" size="lg" onPress={() => void read('camera')} />
          <Button label="Choisir une photo" icon="images-outline" variant="secondary" onPress={() => void read('library')} />
          {!isPremium ? (
            <Text style={styles.quota}>
              {receiptsLeft === 1
                ? 'Dernier ticket gratuit ce mois-ci.'
                : `${pluralize(receiptsLeft, 'ticket gratuit restant', 'tickets gratuits restants')} ce mois-ci.`}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View style={styles.privacy}>
        <Ionicons name="lock-closed-outline" size={15} style={styles.privacyIcon} />
        <Text style={styles.privacyText}>
          Le ticket est lu directement sur votre téléphone : la photo n’est ni envoyée, ni conservée.
        </Text>
      </View>
    </ScrollView>
  );
}

function ReceiptReview({ initial, onRetry }: { initial: ReceiptCandidate[]; onRetry: () => void }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const today = useToday();
  const { addProducts, deleteProduct, activeProducts } = useProducts();
  const { isPremium, showPaywall } = usePremium();
  const { current } = usePlaces();
  const slots = remainingProductSlots(activeProducts.length, isPremium);
  const { items: shoppingItems, removeItems, restoreItem } = useShopping();
  const { showToast } = useToast();
  const [candidates, setCandidates] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selected = useMemo(() => candidates.filter((c) => c.selected && c.name.trim()), [candidates]);
  const total = selected.reduce((sum, c) => sum + (c.price ?? 0), 0);
  // Version gratuite : on ne range pas plus que les places restantes sur 30, sans rien retirer.
  const overLimit = selected.length > slots;

  const update = (key: string, patch: Partial<ReceiptCandidate>) =>
    setCandidates((prev) => prev.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const placeId = current.id === MAIN_PLACE.id ? undefined : current.id;
      const created = await addProducts(selected.map((c) => ({ ...candidateToInput(c, today), placeId })));
      const covered = coveredShoppingItems(
        selected.map((c) => c.name),
        shoppingItems,
      );
      if (covered.length > 0) await removeItems(covered.map((item) => item.id)).catch(() => undefined);
      haptics.success();
      goBack();
      const fromList =
        covered.length > 0 ? ` ${pluralize(covered.length, 'article retiré', 'articles retirés')} de la liste de courses.` : '';
      showToast({
        tone: 'success',
        message: `${pluralize(created.length, 'produit ajouté', 'produits ajoutés')}.${fromList}`,
        durationMs: 6000,
        actionLabel: 'Annuler',
        // Une mauvaise lecture du ticket se rattrape d’un geste : tout revient comme avant.
        onAction: () => {
          Promise.all([...created.map((p) => deleteProduct(p.id)), ...covered.map((item) => restoreItem(item))]).catch(() =>
            showToast({ tone: 'error', message: 'L’annulation n’a pas pu aller au bout.' }),
          );
        },
      });
    } catch {
      setSaveError('Enregistrement impossible. Réessayez.');
      setSaving(false);
    }
  };

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.review} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Text style={styles.reviewTitle}>{pluralize(candidates.length, 'ligne lue', 'lignes lues')}</Text>
        <Text style={styles.reviewHint}>
          Cochez ce qui se range chez vous et corrigez les noms si besoin. Touchez l’emplacement pour le changer. Les dates sont
          estimées : vérifiez-les ensuite sur les emballages.
        </Text>

        <View style={styles.card}>
          {candidates.map((candidate, index) => (
            <CandidateRow
              key={candidate.key}
              candidate={candidate}
              first={index === 0}
              expiresAt={candidateExpiry(candidate, today)}
              onToggle={() => {
                haptics.select();
                update(candidate.key, { selected: !candidate.selected });
              }}
              onRename={(name) => update(candidate.key, { name })}
              onCycleLocation={() => {
                haptics.select();
                update(candidate.key, { location: nextLocation(candidate.location) });
              }}
            />
          ))}
        </View>

        <Button label="Reprendre une photo" icon="camera-outline" variant="ghost" onPress={onRetry} style={styles.retry} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {saveError ? <Text style={styles.saveError}>{saveError}</Text> : null}
        {overLimit ? (
          <Pressable
            onPress={() => showPaywall('products')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.limit, pressed && PRESSED]}
          >
            <Ionicons name="sparkles-outline" size={18} style={styles.limitIcon} />
            <Text style={styles.limitText}>
              {slots === 0
                ? 'La version gratuite suit 30 produits au plus. Passez à Premium pour ranger ce ticket.'
                : `Version gratuite : encore ${pluralize(slots, 'place')}. Décochez des produits ou passez à Premium.`}
            </Text>
          </Pressable>
        ) : null}
        <Button
          label={selected.length > 0 ? `Ajouter ${pluralize(selected.length, 'produit')}` : 'Cochez au moins un produit'}
          icon="checkmark"
          size="lg"
          disabled={selected.length === 0 || overLimit}
          loading={saving}
          onPress={() => void save()}
        />
        {total > 0 ? <Text style={styles.total}>Total des produits cochés : {formatEuros(total)}</Text> : null}
      </View>
    </View>
  );
}

interface CandidateRowProps {
  candidate: ReceiptCandidate;
  first: boolean;
  expiresAt: string;
  onToggle: () => void;
  onRename: (name: string) => void;
  onCycleLocation: () => void;
}

function CandidateRow({ candidate, first, expiresAt, onToggle, onRename, onCycleLocation }: CandidateRowProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const location = LOCATIONS[candidate.location];
  return (
    <View style={[styles.row, !first && styles.rowBorder, !candidate.selected && styles.rowOff]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: candidate.selected }}
        accessibilityLabel={`Ajouter ${candidate.name}`}
        hitSlop={8}
        style={({ pressed }) => [styles.check, pressed && PRESSED]}
      >
        <Ionicons
          name={candidate.selected ? 'checkbox' : 'square-outline'}
          size={26}
          color={candidate.selected ? colors.primary : colors.textSubtle}
        />
      </Pressable>
      <FoodImage name={candidate.name} category={candidate.category} size={40} radius={radius.sm} />
      <View style={styles.rowBody}>
        <TextInput
          value={candidate.name}
          onChangeText={onRename}
          style={styles.nameInput}
          maxLength={80}
          accessibilityLabel="Nom du produit"
        />
        <Text style={styles.rowMeta} numberOfLines={1}>
          {[
            candidate.quantity > 1 ? `×${candidate.quantity}` : '',
            `≈ ${formatShortDate(expiresAt)}`,
            candidate.price !== undefined ? formatEuros(candidate.price) : '',
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
      <Pressable
        onPress={onCycleLocation}
        accessibilityRole="button"
        accessibilityLabel={`Emplacement : ${location.label}. Toucher pour changer`}
        style={({ pressed }) => [styles.location, pressed && styles.pressed]}
      >
        <Ionicons name={location.icon} size={15} color={colors.primary} />
        <Text style={styles.locationText}>{location.shortLabel}</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  flex: { flex: 1, backgroundColor: colors.background },
  intro: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.lg,
    backgroundColor: colors.background,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  reading: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl * 2 },
  readingText: { fontSize: fontSize.bodyLarge, fontWeight: '700', color: colors.text },
  actions: { gap: spacing.sm },
  quota: { fontSize: fontSize.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs },
  error: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  errorIcon: { color: colors.danger },
  errorText: { flex: 1, fontSize: fontSize.body, color: colors.text, lineHeight: 21 },
  privacy: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', paddingHorizontal: spacing.sm },
  privacyIcon: { color: colors.textMuted, marginTop: 2 },
  privacyText: { flex: 1, fontSize: fontSize.caption + 1, color: colors.textMuted, lineHeight: 19 },
  review: { padding: spacing.lg, paddingBottom: spacing.xxl, maxWidth: 760, width: '100%', alignSelf: 'center' },
  reviewTitle: { fontSize: fontSize.title, fontWeight: '800', color: colors.text },
  reviewHint: {
    fontSize: fontSize.caption + 1,
    color: colors.textMuted,
    lineHeight: 19,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    minHeight: MIN_TOUCH + 12,
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.surfaceMuted },
  rowOff: { opacity: 0.55 },
  check: { padding: 2 },
  rowBody: { flex: 1 },
  nameInput: { fontSize: fontSize.body, fontWeight: '600', color: colors.text, paddingVertical: 2 },
  rowMeta: { fontSize: fontSize.caption, color: colors.textMuted },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    minHeight: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  locationText: { fontSize: fontSize.caption, fontWeight: '700', color: colors.primary },
  pressed: { opacity: 0.7 },
  retry: { marginTop: spacing.md },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  saveError: { fontSize: fontSize.caption + 1, color: colors.danger, textAlign: 'center' },
  limit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  limitIcon: { color: colors.primary },
  limitText: { flex: 1, fontSize: fontSize.caption + 1, lineHeight: 19, color: colors.text, fontWeight: '600' },
  total: { fontSize: fontSize.caption, color: colors.textMuted, textAlign: 'center' },
}));
