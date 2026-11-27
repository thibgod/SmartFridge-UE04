import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATEGORIES, LOCATION_ORDER, LOCATIONS } from '@/constants/catalog';
import { SHELF_LIFE_DAYS } from '@/data/shelfLife';
import { useExpiryDateScan } from '@/features/expiry/useExpiryDateScan';
import { MAIN_PLACE } from '@/features/places/places';
import { usePlaces } from '@/features/places/PlacesProvider';
import { useProductPhoto } from '@/features/products/useProductPhoto';
import { NAME_MAX_LENGTH, productToRepurchaseValues, type ProductFormController } from '@/features/products/useProductForm';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { PRESSED, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { Product, ProductCategory, ProductInput, ProductLocation } from '@/types/product';
import { addDays, formatDuration, todayLocalDate } from '@/utils/date';
import { isLocalPhoto } from '@/utils/photo';
import { learnedShelfLifeDays, type FrequentProduct } from '@/utils/products';

import { BarcodeLookup } from './form/BarcodeLookup';
import { CategoryGrid } from './form/CategoryGrid';
import { DateField, type DateSuggestion } from './form/DateField';
import { Field, TextField, useFieldStyles } from './form/FormField';
import { ServingsStepper } from './recipes/ServingsStepper';
import { QuickAdd } from './form/QuickAdd';
import { FoodImage } from './FoodImage';
import { Chip } from './ui/Chip';
import { KeyboardSafeView } from './ui/KeyboardSafeView';
import { GlassButton, GlassSegmentedControl } from './glass';

interface ProductFormProps {
  form: ProductFormController;
  submitLabel: string;
  /** Appelé uniquement avec des données valides. */
  onSubmit: (input: ProductInput) => void;
  submitting?: boolean;
  /** Erreur d’enregistrement à afficher (les toasts sont masqués par les écrans modaux sur iOS). */
  submitError?: string | null;
  onScanPress?: () => void;
  /** Ajout de tout un ticket de caisse (ajout uniquement). */
  onReceiptPress?: () => void;
  /** Propose une date selon la catégorie et l’emplacement (ajout uniquement). */
  suggestDate?: boolean;
  /** Produits fréquents pour l’ajout express (ajout uniquement). */
  frequent?: FrequentProduct[];
  /** Achats précédents, pour proposer la durée de conservation habituelle du produit (ajout uniquement). */
  history?: readonly Product[];
  /** Avertissement non bloquant sous le nom (ex. produit déjà au frigo). */
  nameNotice?: string | null;
  /** Information neutre sous le nom (ex. historique d’achat). */
  nameHint?: string | null;
  /** Actions supplémentaires (ex. suppression) affichées sous le formulaire. */
  footer?: ReactNode;
  /** Plusieurs lots identiques d’un coup (ajout uniquement) : 4 beurres, chacun sur sa ligne. */
  lots?: { value: number; max: number; onChange: (value: number) => void; note?: string | null };
}

export const LOCATION_PHRASE: Record<ProductLocation, string> = {
  frigo: 'au frigo',
  congelateur: 'au congélateur',
  placard: 'au placard',
};

function suggestExpiry(
  category: ProductCategory,
  location: ProductLocation,
  learned: { days: number; count: number } | null,
): DateSuggestion {
  // Les achats précédents du même produit priment sur la moyenne de la catégorie.
  if (learned) {
    const times = learned.count > 1 ? `vos ${learned.count} derniers achats` : 'votre dernier achat';
    return { date: addDays(todayLocalDate(), learned.days), reason: `≈ ${formatDuration(learned.days)}, d’après ${times}` };
  }
  const days = SHELF_LIFE_DAYS[location][category];
  const what = category === 'autre' ? 'un produit' : CATEGORIES[category].label.toLowerCase();
  return { date: addDays(todayLocalDate(), days), reason: `≈ ${formatDuration(days)} pour ${what} ${LOCATION_PHRASE[location]}` };
}

/**
 * Formulaire d’ajout / édition. Ordre pensé pour la vitesse : produit habituel ou code-barres,
 * nom, catégorie, emplacement, date. Le bouton d’enregistrement reste toujours visible en bas.
 */
export function ProductForm({
  form,
  submitLabel,
  onSubmit,
  submitting = false,
  submitError,
  onScanPress,
  onReceiptPress,
  suggestDate = false,
  frequent = [],
  history,
  nameNotice,
  nameHint,
  footer,
  lots,
}: ProductFormProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const fieldStyles = useFieldStyles();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [attempted, setAttempted] = useState(false);
  const [notesOpen, setNotesOpen] = useState(form.values.notes.trim() !== '');
  const { values, errors, lookup, setField, lookupBarcode, removeImage, replaceValues } = form;
  // Choix du lieu seulement quand il y en a plusieurs : sinon le formulaire reste inchangé.
  const { places, allPlaces } = usePlaces();
  const hasFieldErrors = Object.values(errors).some(Boolean);
  const previewName = useDebouncedValue(values.name, 600);
  const setExpiry = useCallback((date: string) => setField('expiresAt', date), [setField]);
  const expiryScan = useExpiryDateScan(setExpiry);
  const setPhoto = useCallback((uri: string) => setField('imageUri', uri), [setField]);
  const photo = useProductPhoto(setPhoto);
  const ownPhoto = isLocalPhoto(values.imageUri);

  const dateSuggestion = useMemo(
    () =>
      suggestDate
        ? suggestExpiry(
            values.category,
            values.location,
            history ? learnedShelfLifeDays(history, previewName, values.location) : null,
          )
        : undefined,
    [suggestDate, values.category, values.location, history, previewName],
  );

  const handleSubmit = () => {
    setAttempted(true);
    const input = form.submit();
    if (input) onSubmit(input);
    // Remonte vers les premiers champs en erreur (nom, date).
    else scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const pickFrequent = (product: Product) => {
    // Un habitué ajouté depuis le Bureau reste au Bureau : on garde le lieu en cours, pas celui de l’ancien achat.
    replaceValues({ ...productToRepurchaseValues(product), placeId: values.placeId });
    setNotesOpen(false);
  };

  const bannerMessage = attempted && hasFieldErrors ? 'Complétez les champs indiqués en rouge.' : submitError;
  const showQuickAdd = frequent.length > 0 && values.name.trim() === '' && values.barcode === '';

  return (
    <KeyboardSafeView style={styles.flex}>
      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        // Sous la barre de titre transparente : iOS décale le contenu de la bonne hauteur.
        contentInsetAdjustmentBehavior="automatic"
      >
        {showQuickAdd ? <QuickAdd items={frequent} onPick={pickFrequent} /> : null}

        <BarcodeLookup
          barcode={values.barcode}
          onChangeBarcode={(text) => setField('barcode', text)}
          onLookup={lookupBarcode}
          onScanPress={onScanPress}
          lookup={lookup}
          error={errors.barcode}
        />
        {onReceiptPress && values.name.trim() === '' && values.barcode === '' ? (
          <Pressable
            onPress={onReceiptPress}
            accessibilityRole="button"
            style={({ pressed }) => [styles.receiptLink, pressed && styles.receiptLinkPressed]}
          >
            <Ionicons name="receipt-outline" size={18} color={colors.primary} />
            <Text style={styles.receiptLinkText}>Plusieurs produits ? Photographiez le ticket de caisse</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textSubtle} />
          </Pressable>
        ) : null}

        <Field label="Produit" required error={errors.name}>
          <View style={styles.nameRow}>
            <View>
              <Pressable
                onPress={photo.choose}
                disabled={photo.busy}
                accessibilityRole="button"
                accessibilityLabel={ownPhoto ? 'Changer la photo du produit' : 'Ajouter une photo du produit'}
                style={({ pressed }) => pressed && styles.photoPressed}
              >
                <FoodImage
                  name={previewName}
                  category={values.category}
                  uri={values.imageUri || undefined}
                  size={52}
                  radius={radius.md}
                />
                <View style={styles.photoBadge}>
                  <Ionicons name="camera" size={11} color={colors.onPrimary} />
                </View>
              </Pressable>
              {values.imageUri ? (
                <Pressable
                  onPress={removeImage}
                  accessibilityRole="button"
                  accessibilityLabel={ownPhoto ? 'Retirer la photo' : 'Retirer la photo Open Food Facts'}
                  hitSlop={10}
                  style={({ pressed }) => [styles.removePhoto, pressed && PRESSED]}
                >
                  <Ionicons name="close" size={12} color="#FFFFFF" />
                </Pressable>
              ) : null}
            </View>
            <TextInput
              value={values.name}
              onChangeText={(text) => setField('name', text)}
              placeholder="Ex. Yaourts nature"
              placeholderTextColor={colors.textSubtle}
              maxLength={NAME_MAX_LENGTH}
              autoCapitalize="sentences"
              returnKeyType="done"
              accessibilityLabel="Nom du produit"
              style={[fieldStyles.input, styles.nameInput, errors.name ? styles.inputError : null]}
            />
          </View>
          {photo.error ? <Text style={styles.photoError}>{photo.error}</Text> : null}
          {nameNotice ? (
            <View style={styles.notice} accessibilityLiveRegion="polite">
              <Ionicons name="information-circle" size={18} color={colors.warning} />
              <Text style={styles.noticeText}>{nameNotice}</Text>
            </View>
          ) : nameHint ? (
            <View style={styles.hintRow}>
              <Ionicons name="time-outline" size={15} color={colors.textMuted} />
              <Text style={styles.hintText}>{nameHint}</Text>
            </View>
          ) : null}
          {values.brand ? <Text style={styles.brand}>{values.brand}</Text> : null}
        </Field>

        <Field
          label="Catégorie"
          required
          hint={form.categoryGuessed ? 'Choisie d’après le nom : touchez une autre catégorie pour corriger.' : undefined}
        >
          <CategoryGrid value={values.category} onChange={(category) => setField('category', category)} />
        </Field>

        <Field label="Emplacement" required>
          <GlassSegmentedControl
            segments={LOCATION_ORDER.map((location) => ({
              value: location,
              label: LOCATIONS[location].label,
              icon: LOCATIONS[location].icon,
            }))}
            value={values.location}
            onChange={(location) => setField('location', location)}
          />
        </Field>

        {places.length > 0 ? (
          <Field label="Lieu">
            <View style={styles.places}>
              {allPlaces.map((place) => (
                <Chip
                  key={place.id}
                  size="sm"
                  icon={place.icon}
                  label={place.name}
                  selected={(values.placeId ?? MAIN_PLACE.id) === place.id}
                  onPress={() => setField('placeId', place.id === MAIN_PLACE.id ? undefined : place.id)}
                />
              ))}
            </View>
          </Field>
        ) : null}

        <DateField
          value={values.expiresAt}
          onChange={setExpiry}
          error={errors.expiresAt}
          suggestion={dateSuggestion}
          scan={expiryScan.available ? { state: expiryScan.state, onScan: () => void expiryScan.scan() } : undefined}
        />

        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField
              label="Quantité"
              value={values.quantity}
              onChangeText={(text) => setField('quantity', text)}
              placeholder="1, 500 g…"
              maxLength={40}
            />
          </View>
          <View style={styles.flex}>
            <TextField
              label="Prix (€)"
              value={values.priceText}
              onChangeText={(text) => setField('priceText', text)}
              placeholder="2,50"
              keyboardType="decimal-pad"
              error={errors.priceText}
              hint="Pour vos économies"
              maxLength={8}
            />
          </View>
        </View>

        {lots ? (
          <Field label="Nombre de lots">
            <View style={styles.lotsRow}>
              <ServingsStepper
                value={lots.value}
                min={1}
                max={lots.max}
                unit={['lot', 'lots']}
                icon="layers-outline"
                onChange={lots.onChange}
              />
              <Text style={styles.lotsHint}>
                {lots.note ?? 'Ex. 4 beurres : chacun se consomme à part, réunis sur une ligne à l’accueil.'}
              </Text>
            </View>
          </Field>
        ) : null}

        {notesOpen ? (
          <TextField
            label="Notes"
            value={values.notes}
            onChangeText={(text) => setField('notes', text)}
            placeholder="Ex. entamé, à finir pour le dîner"
            multiline
            maxLength={200}
          />
        ) : (
          <Pressable
            onPress={() => setNotesOpen(true)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.addNote, pressed && PRESSED]}
            hitSlop={6}
          >
            <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.addNoteText}>Ajouter une note</Text>
          </Pressable>
        )}

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {bannerMessage ? (
          <View style={styles.errorBanner} accessibilityRole="alert">
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorText}>{bannerMessage}</Text>
          </View>
        ) : null}
        {/* Bouton principal en verre teinté, posé sur le fond : plus de bandeau opaque en bas du formulaire. */}
        <GlassButton
          label={submitLabel}
          onPress={handleSubmit}
          loading={submitting}
          size="lg"
          icon="checkmark"
          variant="prominent"
        />
      </View>
    </KeyboardSafeView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  flex: { flex: 1 },
  places: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  lotsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  lotsHint: { flex: 1, fontSize: fontSize.caption, color: colors.textMuted, lineHeight: 17 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, width: '100%', maxWidth: 680, alignSelf: 'center' },
  receiptLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  receiptLinkPressed: { opacity: 0.75 },
  receiptLinkText: { flex: 1, fontSize: fontSize.caption + 1, fontWeight: '700', color: colors.primary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nameInput: { flex: 1, fontWeight: '600' },
  inputError: { borderColor: colors.danger, borderWidth: 1.5 },
  removePhoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPressed: { opacity: 0.75 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
  },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, marginLeft: spacing.xs },
  hintText: { flex: 1, fontSize: fontSize.caption, color: colors.textMuted },
  noticeText: { flex: 1, fontSize: fontSize.caption + 1, color: colors.text, lineHeight: 18 },
  photoBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoError: { fontSize: fontSize.caption, color: colors.danger, marginLeft: 64 },
  brand: { fontSize: fontSize.caption, color: colors.textMuted, marginLeft: 64 },
  row: { flexDirection: 'row', gap: spacing.md },
  addNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
  },
  addNoteText: { fontSize: fontSize.body, fontWeight: '700', color: colors.primary },
  footer: { marginTop: spacing.xl, gap: spacing.sm },
  bottomBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  errorText: { flex: 1, fontSize: fontSize.body, fontWeight: '600', color: colors.danger },
}));
