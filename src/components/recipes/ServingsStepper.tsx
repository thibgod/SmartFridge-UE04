import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { PRESSED, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';

interface ServingsStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

/** Nombre de personnes : les quantités de la recette suivent. */
export function ServingsStepper({ value, onChange, min = 1, max = 12 }: ServingsStepperProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const step = (delta: number) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next === value) return;
    haptics.select();
    onChange(next);
  };
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${value} personne${value > 1 ? 's' : ''}`}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => step(event.nativeEvent.actionName === 'increment' ? 1 : -1)}
    >
      <Pressable
        onPress={() => step(-1)}
        disabled={value <= min}
        hitSlop={8}
        style={({ pressed }) => [styles.button, value <= min && styles.disabled, pressed && PRESSED]}
      >
        <Ionicons name="remove" size={18} color={colors.primary} />
      </Pressable>
      <View style={styles.value}>
        <Ionicons name="people-outline" size={15} color={colors.textMuted} />
        <Text style={styles.valueText}>{value}</Text>
      </View>
      <Pressable
        onPress={() => step(1)}
        disabled={value >= max}
        hitSlop={8}
        style={({ pressed }) => [styles.button, value >= max && styles.disabled, pressed && PRESSED]}
      >
        <Ionicons name="add" size={18} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  disabled: { opacity: 0.35 },
  value: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 44, justifyContent: 'center' },
  valueText: { fontSize: fontSize.body, fontWeight: '800', color: colors.text },
}));
