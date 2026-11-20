import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TextField } from '@/components/form/FormField';
import { Button } from '@/components/ui/Button';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { useToast } from '@/features/feedback/ToastProvider';
import {
  countByPlace,
  MAIN_PLACE,
  MAX_EXTRA_PLACES,
  PLACE_ICONS,
  PLACE_NAME_MAX_LENGTH,
  type Place,
} from '@/features/places/places';
import { usePlaces } from '@/features/places/PlacesProvider';
import { usePremium } from '@/features/premium/PremiumProvider';
import { useProducts } from '@/features/products/ProductsProvider';
import { fontSize, makeStyles, MIN_TOUCH, PRESSED, radius, spacing, useTheme } from '@/theme';
import type { IconName } from '@/types/content';
import { haptics } from '@/utils/haptics';
import { goBack } from '@/utils/navigation';
import { pluralize } from '@/utils/text';

type Editing = { mode: 'new' } | { mode: 'edit'; place: Place } | null;

/** Mes lieux : choisir celui affiché sur l’accueil, en ajouter (Premium), renommer, supprimer. */
export default function PlacesScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { products } = useProducts();
  const { places, allPlaces, current, setCurrent, canAdd, removePlace } = usePlaces();
  const { isPremium, showPaywall } = usePremium();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<Editing>(null);
  const counts = countByPlace(products, places);

  if (editing) {
    return <PlaceEditor editing={editing} onDone={() => setEditing(null)} />;
  }

  const choose = (place: Place) => {
    haptics.select();
    setCurrent(place.id);
    goBack();
  };

  const confirmRemove = (place: Place) => {
    const count = counts[place.id] ?? 0;
    Alert.alert(
      `Supprimer « ${place.name} » ?`,
      count > 0
        ? `${pluralize(count, 'produit revient', 'produits reviennent')} à la maison. Aucun produit n’est effacé.`
        : 'Ce lieu ne contient aucun produit.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () =>
            void removePlace(place.id)
              .then(() => showToast({ tone: 'neutral', message: `« ${place.name} » a été supprimé.` }))
              .catch(() => showToast({ tone: 'error', message: 'La suppression a échoué.' })),
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}>
      <Text style={styles.intro}>
        Un frigo au bureau, une résidence secondaire, une cave ? Chaque lieu a son frigo, son congélateur et son placard.
      </Text>

      <View style={styles.card}>
        {allPlaces.map((place, index) => {
          const selected = place.id === current.id;
          const count = counts[place.id] ?? 0;
          return (
            <View key={place.id} style={[styles.row, index > 0 && styles.rowBorder]}>
              <Pressable
                onPress={() => choose(place)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${place.name}, ${pluralize(count, 'produit')}`}
                accessibilityHint="Affiche ce lieu sur l’accueil"
                style={({ pressed }) => [styles.rowMain, pressed && PRESSED]}
              >
                <View style={[styles.icon, selected && styles.iconSelected]}>
                  <Ionicons name={place.icon} size={20} color={selected ? colors.onPrimary : colors.primary} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.name}>{place.name}</Text>
                  <Text style={styles.meta}>{pluralize(count, 'produit')}</Text>
                </View>
                {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
              </Pressable>
              {place.id !== MAIN_PLACE.id ? (
                <>
                  <Pressable
                    onPress={() => setEditing({ mode: 'edit', place })}
                    accessibilityRole="button"
                    accessibilityLabel={`Modifier ${place.name}`}
                    hitSlop={6}
                    style={({ pressed }) => [styles.action, pressed && PRESSED]}
                  >
                    <Ionicons name="create-outline" size={20} color={colors.textMuted} />
                  </Pressable>
                  <Pressable
                    onPress={() => confirmRemove(place)}
                    accessibilityRole="button"
                    accessibilityLabel={`Supprimer ${place.name}`}
                    hitSlop={6}
                    style={({ pressed }) => [styles.action, pressed && PRESSED]}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </Pressable>
                </>
              ) : null}
            </View>
          );
        })}
      </View>

      {canAdd ? (
        <Button label="Ajouter un lieu" icon="add" variant="tonal" size="lg" onPress={() => setEditing({ mode: 'new' })} />
      ) : !isPremium ? (
        <Button
          label="Ajouter un lieu avec Premium"
          icon="sparkles-outline"
          variant="tonal"
          size="lg"
          onPress={() => showPaywall('settings')}
        />
      ) : (
        <Text style={styles.meta}>{`Jusqu’à ${MAX_EXTRA_PLACES} lieux en plus de la maison.`}</Text>
      )}
      {!isPremium && places.length > 0 ? (
        <Text style={styles.note}>Vos lieux restent consultables et modifiables ; en créer de nouveaux demande Premium.</Text>
      ) : null}
    </ScrollView>
  );
}

function PlaceEditor({ editing, onDone }: { editing: NonNullable<Editing>; onDone: () => void }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { addPlace, updatePlace, validateName, setCurrent } = usePlaces();
  const initial = editing.mode === 'edit' ? editing.place : null;
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState<IconName>(initial?.icon ?? 'briefcase-outline');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const problem = validateName(name, initial?.id);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    try {
      if (initial) {
        await updatePlace(initial.id, name, icon);
      } else {
        const place = await addPlace(name, icon);
        // Un lieu tout juste créé est vide : on l’affiche pour y ranger les premiers produits.
        setCurrent(place.id);
      }
      haptics.success();
      onDone();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Enregistrement impossible.');
      setSaving(false);
    }
  };

  return (
    <KeyboardSafeView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField
          label="Nom du lieu"
          required
          value={name}
          onChangeText={(text) => {
            setName(text);
            setError(null);
          }}
          error={error ?? undefined}
          placeholder="Bureau, Chalet, Cave…"
          maxLength={PLACE_NAME_MAX_LENGTH}
          autoCapitalize="sentences"
          autoFocus={!initial}
          returnKeyType="done"
          onSubmitEditing={() => void save()}
        />
        <Text style={styles.label}>Icône</Text>
        <View style={styles.icons} accessibilityRole="radiogroup">
          {PLACE_ICONS.map((option) => {
            const selected = option.icon === icon;
            return (
              <Pressable
                key={option.icon}
                onPress={() => {
                  haptics.select();
                  setIcon(option.icon);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={option.label}
                style={({ pressed }) => [styles.iconChoice, selected && styles.iconChoiceSelected, pressed && PRESSED]}
              >
                <Ionicons name={option.icon} size={24} color={selected ? colors.onPrimary : colors.primary} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button label="Annuler" variant="secondary" size="lg" style={styles.flex} onPress={onDone} />
        <Button
          label={initial ? 'Enregistrer' : 'Créer le lieu'}
          icon="checkmark"
          size="lg"
          style={styles.flex}
          loading={saving}
          onPress={() => void save()}
        />
      </View>
    </KeyboardSafeView>
  );
}

const ICON_CHOICE = 52;

const useStyles = makeStyles(({ colors }) => ({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, width: '100%', maxWidth: 680, alignSelf: 'center' },
  intro: { fontSize: fontSize.body, lineHeight: 22, color: colors.textMuted },
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: spacing.sm },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.surfaceMuted },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: MIN_TOUCH + 16,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  iconSelected: { backgroundColor: colors.primary },
  name: { fontSize: fontSize.bodyLarge, fontWeight: '700', color: colors.text },
  meta: { fontSize: fontSize.caption, color: colors.textMuted, marginTop: 2 },
  action: { width: MIN_TOUCH, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  note: { fontSize: fontSize.caption, lineHeight: 18, color: colors.textMuted, textAlign: 'center' },
  label: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconChoice: {
    width: ICON_CHOICE,
    height: ICON_CHOICE,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  iconChoiceSelected: { backgroundColor: colors.primary },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
}));
