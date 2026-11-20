import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import type { ExpiryScanState } from '@/features/expiry/useExpiryDateScan';
import { fontSize, makeStyles, MIN_TOUCH, radius, spacing, useTheme } from '@/theme';
import {
  addDays,
  addMonths,
  daysBetween,
  formatLongDate,
  formatLongDateCapitalized,
  formatShortDate,
  isValidLocalDate,
  parseLocalDate,
  todayLocalDate,
  toLocalDateString,
} from '@/utils/date';
import { getExpiryLabel } from '@/utils/expiry';

import { Chip } from '../ui/Chip';

import { Field } from './FormField';

export interface DateSuggestion {
  date: string;
  /** Ex. « ≈ 2 jours pour viande / poisson au frigo ». */
  reason: string;
}

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  suggestion?: DateSuggestion;
  /** Lecture de la date sur l’emballage (absente si la lecture de texte n’est pas disponible). */
  scan?: { state: ExpiryScanState; onScan: () => void };
}

const KIND_LABEL = { dlc: 'DLC', ddm: 'DDM' } as const;

const SHORTCUTS: readonly { label: string; compute: (today: string) => string }[] = [
  { label: 'Demain', compute: (t) => addDays(t, 1) },
  { label: '+3 j', compute: (t) => addDays(t, 3) },
  { label: '+1 sem.', compute: (t) => addDays(t, 7) },
  { label: '+2 sem.', compute: (t) => addDays(t, 14) },
  { label: '+1 mois', compute: (t) => addMonths(t, 1) },
  { label: '+6 mois', compute: (t) => addMonths(t, 6) },
];

/**
 * Date de péremption : suggestion intelligente, raccourcis en un geste et
 * sélecteur natif (dialogue Android / calendrier iOS) pour une date précise.
 */
export function DateField({ value, onChange, error, suggestion, scan }: DateFieldProps) {
  const { colors, isDark } = useTheme();
  const styles = useStyles();
  const [iosPickerVisible, setIosPickerVisible] = useState(false);
  const today = todayLocalDate();
  const valid = isValidLocalDate(value);
  const current = valid ? parseLocalDate(value) : parseLocalDate(addDays(today, 3));

  const handlePicked = (date: Date) => onChange(toLocalDateString(date));

  const openPicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ value: current, mode: 'date', onValueChange: (_event, date) => handlePicked(date) });
    } else {
      setIosPickerVisible((visible) => !visible);
    }
  };

  const scanState = scan?.state;
  const reading = scanState?.status === 'reading';

  return (
    <Field label="Date de péremption" required error={error}>
      <View style={styles.displayRow}>
        <Pressable
          onPress={openPicker}
          accessibilityRole="button"
          accessibilityLabel={value ? `Date de péremption : ${formatLongDate(value)}. Modifier` : 'Choisir la date de péremption'}
          style={({ pressed }) => [styles.display, error ? styles.displayError : null, pressed && styles.pressed]}
        >
          <View style={styles.calendarIcon}>
            <Ionicons name="calendar" size={18} color={colors.primary} />
          </View>
          <View style={styles.displayTexts}>
            <Text style={[styles.displayText, !valid && styles.placeholder]}>
              {valid ? formatLongDateCapitalized(value) : 'Choisir une date'}
            </Text>
            {valid ? (
              <Text style={styles.relative}>{getExpiryLabel(daysBetween(today, value))}</Text>
            ) : scan ? (
              <Text style={styles.relative}>ou photographiez-la sur l’emballage</Text>
            ) : null}
          </View>
          <Ionicons name={iosPickerVisible ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
        </Pressable>
        {scan ? (
          <Pressable
            onPress={scan.onScan}
            disabled={reading}
            accessibilityRole="button"
            accessibilityLabel="Lire la date sur l’emballage avec l’appareil photo"
            accessibilityState={{ busy: reading }}
            style={({ pressed }) => [styles.scanButton, pressed && styles.pressed]}
          >
            {reading ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="camera" size={22} color={colors.primary} />}
          </Pressable>
        ) : null}
      </View>

      {scanState?.status === 'found' && scanState.date === value ? (
        <View style={styles.scanResult} accessibilityLiveRegion="polite">
          <Ionicons name="scan" size={16} color={colors.success} />
          <Text style={styles.scanResultText}>
            {scanState.kind ? `${KIND_LABEL[scanState.kind]} lue` : 'Date lue'} sur l’emballage : vérifiez qu’elle est juste.
          </Text>
        </View>
      ) : scanState?.status === 'error' ? (
        <Text style={styles.scanError} accessibilityRole="alert">
          {scanState.message}
        </Text>
      ) : null}

      {Platform.OS === 'ios' && iosPickerVisible ? (
        <View style={styles.iosPicker}>
          <DateTimePicker
            value={current}
            mode="date"
            display="inline"
            locale="fr-FR"
            accentColor={colors.primary}
            themeVariant={isDark ? 'dark' : 'light'}
            onValueChange={(_event, date) => {
              handlePicked(date);
              setIosPickerVisible(false);
            }}
          />
        </View>
      ) : null}

      {suggestion ? (
        <Pressable
          onPress={() => onChange(suggestion.date)}
          accessibilityRole="button"
          accessibilityState={{ selected: value === suggestion.date }}
          accessibilityLabel={`Utiliser la date suggérée : ${formatLongDate(suggestion.date)}, ${suggestion.reason}`}
          style={({ pressed }) => [styles.suggestion, value === suggestion.date && styles.suggestionSelected, pressed && styles.pressed]}
        >
          <Ionicons name="sparkles" size={18} color={colors.primary} />
          <View style={styles.suggestionText}>
            <Text style={styles.suggestionTitle}>Suggestion : {formatShortDate(suggestion.date)}</Text>
            <Text style={styles.suggestionReason}>{suggestion.reason} · vérifiez l’emballage</Text>
          </View>
          {value === suggestion.date ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
        </Pressable>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shortcuts} keyboardShouldPersistTaps="handled">
        {SHORTCUTS.map((shortcut) => {
          const target = shortcut.compute(today);
          return (
            <Chip
              key={shortcut.label}
              size="sm"
              label={shortcut.label}
              selected={value === target}
              onPress={() => onChange(target)}
              accessibilityLabel={`${shortcut.label} : ${formatLongDate(target)}`}
            />
          );
        })}
      </ScrollView>
    </Field>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  displayRow: { flexDirection: 'row', gap: spacing.sm },
  scanButton: {
    width: MIN_TOUCH + 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  scanResult: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  scanResultText: { flex: 1, fontSize: fontSize.caption + 1, color: colors.text },
  scanError: { fontSize: fontSize.caption + 1, color: colors.danger, lineHeight: 19 },
  display: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TOUCH + 12,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  displayError: { borderColor: colors.danger, borderWidth: 1.5 },
  pressed: { opacity: 0.8 },
  calendarIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayTexts: { flex: 1 },
  displayText: { fontSize: fontSize.bodyLarge - 1, fontWeight: '600', color: colors.text },
  relative: { fontSize: fontSize.caption, color: colors.textMuted, marginTop: 1 },
  placeholder: { color: colors.textSubtle, fontWeight: '400' },
  iosPicker: { backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden' },
  shortcuts: { gap: spacing.sm, paddingVertical: 2 },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    minHeight: MIN_TOUCH,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  suggestionSelected: { borderStyle: 'solid', borderWidth: 1.5 },
  suggestionText: { flex: 1 },
  suggestionTitle: { fontSize: fontSize.body, fontWeight: '700', color: colors.primary },
  suggestionReason: { fontSize: fontSize.caption, color: colors.text, marginTop: 2 },
}));
