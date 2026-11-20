import type { PropsWithChildren } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { fontSize, makeStyles, MIN_TOUCH, radius, spacing, useTheme } from '@/theme';

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
}

/** Libellé + contenu + message d’erreur ou d’aide. */
export function Field({ label, required, error, hint, children }: PropsWithChildren<FieldProps>) {
  const styles = useStyles();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

interface TextFieldProps extends FieldProps, Omit<TextInputProps, 'style'> {}

export function TextField({ label, required, error, hint, ...inputProps }: TextFieldProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Field label={label} required={required} error={error} hint={hint}>
      <TextInput
        placeholderTextColor={colors.textSubtle}
        accessibilityLabel={label}
        {...inputProps}
        style={[styles.input, error ? styles.inputError : null, inputProps.multiline && styles.multiline]}
      />
    </Field>
  );
}

/** Style partagé des champs de saisie (utilisé aussi hors TextField). */
export const useFieldStyles = makeStyles(({ colors }) => ({
  input: {
    minHeight: MIN_TOUCH + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    fontSize: fontSize.bodyLarge,
    color: colors.text,
  },
}));

const useStyles = makeStyles(({ colors }) => ({
  field: { gap: spacing.xs + 2, marginBottom: spacing.lg },
  label: { fontSize: fontSize.caption + 1, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  required: { color: colors.danger },
  input: {
    minHeight: MIN_TOUCH + 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    fontSize: fontSize.bodyLarge,
    color: colors.text,
  },
  inputError: { borderColor: colors.danger, borderWidth: 1.5 },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  error: { fontSize: fontSize.caption, color: colors.danger, fontWeight: '600' },
  hint: { fontSize: fontSize.caption, color: colors.textMuted },
}));
