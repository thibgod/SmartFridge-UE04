import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Keyboard, Pressable, Text, TextInput, View } from 'react-native';

import type { LookupState } from '@/features/products/useProductForm';
import { isPlausibleBarcode, normalizeBarcode } from '@/services/openFoodFacts/client';
import { MIN_TOUCH, PRESSED, fontSize, makeStyles, radius, spacing, type Palette, useTheme } from '@/theme';
import type { IconName } from '@/types/content';

import { useFieldStyles } from './FormField';

interface BarcodeLookupProps {
  barcode: string;
  onChangeBarcode: (value: string) => void;
  onLookup: (barcode: string) => void;
  onScanPress?: () => void;
  lookup: LookupState;
  error?: string;
}

const EAN13_LENGTH = 13;

/**
 * Remplissage automatique compact : bouton scanner + saisie du code sur une seule ligne
 * (la carte précédente occupait un tiers de l’écran même pour une saisie manuelle).
 */
export function BarcodeLookup({ barcode, onChangeBarcode, onLookup, onScanPress, lookup, error }: BarcodeLookupProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const fieldStyles = useFieldStyles();
  const loading = lookup.status === 'loading';
  const canSearch = isPlausibleBarcode(normalizeBarcode(barcode)) && !loading;

  const handleChange = (text: string) => {
    const digits = normalizeBarcode(text);
    onChangeBarcode(digits);
    // EAN-13, le format le plus courant : recherche lancée sans avoir à toucher la loupe.
    if (digits.length === EAN13_LENGTH && digits !== normalizeBarcode(barcode)) {
      Keyboard.dismiss();
      onLookup(digits);
    }
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Remplir avec le code-barres</Text>
      <View style={styles.inputRow}>
        {onScanPress ? (
          <Pressable
            onPress={onScanPress}
            accessibilityRole="button"
            accessibilityLabel="Scanner un code-barres"
            style={({ pressed }) => [styles.scanButton, pressed && styles.scanPressed]}
          >
            <Ionicons name="barcode-outline" size={22} color={colors.onPrimary} />
            <Text style={styles.scanLabel}>Scanner</Text>
          </Pressable>
        ) : null}
        <View style={[fieldStyles.input, styles.inputBox, error ? { borderColor: colors.danger } : null]}>
          <TextInput
            value={barcode}
            onChangeText={handleChange}
            placeholder="ou saisir le code"
            placeholderTextColor={colors.textSubtle}
            keyboardType="number-pad"
            maxLength={14}
            autoCorrect={false}
            accessibilityLabel="Code-barres"
            accessibilityHint="La recherche démarre automatiquement après 13 chiffres"
            style={styles.input}
          />
          <Pressable
            onPress={() => onLookup(barcode)}
            disabled={!canSearch}
            accessibilityRole="button"
            accessibilityLabel="Rechercher ce code-barres"
            accessibilityState={{ disabled: !canSearch, busy: loading }}
            hitSlop={8}
            style={({ pressed }) => [!canSearch && !loading ? styles.disabled : null, pressed && PRESSED]}
          >
            {loading ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="search" size={20} color={colors.primary} />}
          </Pressable>
        </View>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <LookupMessage lookup={lookup} />
    </View>
  );
}

function LookupMessage({ lookup }: { lookup: LookupState }) {
  switch (lookup.status) {
    case 'idle':
      return null;
    case 'loading':
      return <Message tone="info" icon="cloud-download-outline" text="Recherche dans Open Food Facts…" />;
    case 'found':
      return (
        <Message
          tone="success"
          icon="checkmark-circle"
          text={`Produit trouvé${lookup.name ? ` : ${lookup.name}` : ''}. Il ne reste qu’à choisir la date.`}
        />
      );
    case 'not_found':
      return (
        <Message tone="warning" icon="help-circle" text="Produit inconnu d’Open Food Facts : complétez simplement la fiche." />
      );
    case 'error':
      return <Message tone="warning" icon="cloud-offline-outline" text={lookup.message} />;
  }
}

function toneColors(colors: Palette, tone: 'info' | 'success' | 'warning') {
  return {
    info: { fg: colors.info, bg: colors.infoSoft },
    success: { fg: colors.success, bg: colors.successSoft },
    warning: { fg: colors.warning, bg: colors.warningSoft },
  }[tone];
}

function Message({ tone, icon, text }: { tone: 'info' | 'success' | 'warning'; icon: IconName; text: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const palette = toneColors(colors, tone);
  return (
    <View style={[styles.message, { backgroundColor: palette.bg }]} accessibilityLiveRegion="polite" accessibilityRole="text">
      <Ionicons name={icon} size={18} color={palette.fg} />
      <Text style={[styles.messageText, { color: palette.fg }]}>{text}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  wrapper: { gap: spacing.sm, marginBottom: spacing.xl },
  title: {
    fontSize: fontSize.caption + 1,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputRow: { flexDirection: 'row', gap: spacing.sm },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    minHeight: MIN_TOUCH + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  scanPressed: { backgroundColor: colors.primaryPressed },
  scanLabel: { color: colors.onPrimary, fontSize: fontSize.body, fontWeight: '800' },
  inputBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 0 },
  input: { flex: 1, fontSize: fontSize.bodyLarge, color: colors.text, paddingVertical: spacing.sm },
  disabled: { opacity: 0.35 },
  errorText: { fontSize: fontSize.caption, color: colors.danger, fontWeight: '600' },
  message: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md },
  messageText: { flex: 1, fontSize: fontSize.caption + 1, fontWeight: '600', lineHeight: 19 },
}));
