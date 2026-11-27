import { Pressable, Text, View } from 'react-native';

import { FridgeMascot } from '@/components/FridgeMascot';
import { MASCOT_ORDER, MASCOTS, type MascotId } from '@/features/mascot/mascots';
import { CHROME_FONT_SCALE, fontSize, makeStyles, MIN_TOUCH, radius, spacing } from '@/theme';
import { haptics } from '@/utils/haptics';

interface MascotPickerProps {
  value: MascotId;
  onChange: (value: MascotId) => void;
}

/** Choix de la mascotte : chaque personnage se présente avec le sourire, la mascotte choisie est entourée. */
export function MascotPicker({ value, onChange }: MascotPickerProps) {
  const styles = useStyles();
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {MASCOT_ORDER.map((id) => {
        const selected = id === value;
        return (
          <Pressable
            key={id}
            onPress={() => {
              if (!selected) haptics.select();
              onChange(id);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`${MASCOTS[id].label} : ${MASCOTS[id].description}`}
            style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.pressed]}
          >
            <View style={styles.preview}>
              <FridgeMascot kind={id} size={56} face={selected ? 'happy' : 'normal'} />
            </View>
            <Text style={[styles.label, selected && styles.labelSelected]} maxFontSizeMultiplier={CHROME_FONT_SCALE}>
              {MASCOTS[id].label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  row: { flexDirection: 'row', gap: spacing.sm },
  choice: {
    flex: 1,
    minHeight: MIN_TOUCH,
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceMuted,
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pressed: { transform: [{ scale: 0.97 }] },
  preview: { height: 76, justifyContent: 'center' },
  label: { fontSize: fontSize.caption + 1, fontWeight: '700', color: colors.textMuted },
  labelSelected: { color: colors.primary, fontWeight: '800' },
}));
