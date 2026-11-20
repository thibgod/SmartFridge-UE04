import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { ACCENT_ORDER, ACCENTS, type AccentId } from '@/theme/accents';
import { fontSize, makeStyles, MIN_TOUCH, PRESSED, spacing, useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';

interface AccentPickerProps {
  value: AccentId;
  /** Sans Premium, les pastilles restent visibles avec un cadenas et mènent à l’offre. */
  locked: boolean;
  onChange: (accent: AccentId) => void;
  onLockedPress: () => void;
}

/** Pastilles de couleur d’accent : la couleur se voit, le nom se lit dessous. */
export function AccentPicker({ value, locked, onChange, onLockedPress }: AccentPickerProps) {
  const { colors, isDark } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {ACCENT_ORDER.map((id) => {
        const accent = ACCENTS[id];
        const swatch = isDark ? accent.dark.primary : accent.light.primary;
        const selected = !locked && id === value;
        const blocked = locked && id !== 'foret';
        return (
          <Pressable
            key={id}
            onPress={() => {
              if (blocked) {
                onLockedPress();
                return;
              }
              haptics.select();
              onChange(id);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected || (locked && id === 'foret') }}
            accessibilityLabel={`${accent.label}${blocked ? ', Premium' : ''}`}
            style={({ pressed }) => [styles.item, pressed && PRESSED]}
          >
            <View style={[styles.ring, (selected || (locked && id === 'foret')) && { borderColor: swatch }]}>
              <View style={[styles.swatch, { backgroundColor: swatch }]}>
                {blocked ? <Ionicons name="lock-closed" size={14} color={isDark ? '#0E1411' : '#FFFFFF'} /> : null}
                {selected || (locked && id === 'foret') ? (
                  <Ionicons name="checkmark" size={18} color={isDark ? accent.dark.onPrimary : accent.light.onPrimary} />
                ) : null}
              </View>
            </View>
            <Text style={[styles.label, { color: selected ? colors.text : colors.textMuted }]} numberOfLines={1}>
              {accent.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const SWATCH = 36;

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  item: { flex: 1, alignItems: 'center', gap: spacing.xs, minHeight: MIN_TOUCH },
  ring: {
    width: SWATCH + 8,
    height: SWATCH + 8,
    borderRadius: (SWATCH + 8) / 2,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatch: { width: SWATCH, height: SWATCH, borderRadius: SWATCH / 2, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: fontSize.micro + 1, fontWeight: '700' },
}));
