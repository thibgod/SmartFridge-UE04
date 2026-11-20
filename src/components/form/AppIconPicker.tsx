import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { currentAppIcon, setAppIcon, type AppIconId } from '@/services/appIcon';
import { ACCENT_ORDER, ACCENTS } from '@/theme/accents';
import { fontSize, makeStyles, MIN_TOUCH, PRESSED, radius, spacing, useTheme } from '@/theme';
import { haptics } from '@/utils/haptics';

const THUMBS: Record<AppIconId, number> = {
  foret: require('../../../assets/app-icons/thumbs/foret.png'),
  ocean: require('../../../assets/app-icons/thumbs/ocean.png'),
  framboise: require('../../../assets/app-icons/thumbs/framboise.png'),
  prune: require('../../../assets/app-icons/thumbs/prune.png'),
  terracotta: require('../../../assets/app-icons/thumbs/terracotta.png'),
};

interface AppIconPickerProps {
  locked: boolean;
  onLockedPress: () => void;
  onError: () => void;
}

/** Icône de l’app sur l’écran d’accueil du téléphone (Premium), assortie aux couleurs d’accent. */
export function AppIconPicker({ locked, onLockedPress, onError }: AppIconPickerProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [selected, setSelected] = useState<AppIconId>(() => currentAppIcon());

  const choose = async (icon: AppIconId) => {
    if (locked && icon !== 'foret') {
      onLockedPress();
      return;
    }
    if (icon === selected) return;
    haptics.select();
    const previous = selected;
    setSelected(icon);
    try {
      await setAppIcon(icon);
    } catch {
      setSelected(previous);
      onError();
    }
  };

  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {ACCENT_ORDER.map((id) => {
        const isSelected = id === selected;
        const blocked = locked && id !== 'foret';
        return (
          <Pressable
            key={id}
            onPress={() => void choose(id)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={`Icône ${ACCENTS[id].label}${blocked ? ', Premium' : ''}`}
            style={({ pressed }) => [styles.item, pressed && PRESSED]}
          >
            <View style={[styles.frame, isSelected && { borderColor: colors.primary }]}>
              <Image source={THUMBS[id]} style={styles.icon} contentFit="cover" accessible={false} />
              {blocked ? (
                <View style={styles.lock}>
                  <Ionicons name="lock-closed" size={12} color="#FFFFFF" />
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color: isSelected ? colors.text : colors.textMuted }]} numberOfLines={1}>
              {ACCENTS[id].label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const ICON = 46;

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  item: { flex: 1, alignItems: 'center', gap: spacing.xs, minHeight: MIN_TOUCH },
  frame: { padding: 3, borderRadius: radius.md + 3, borderWidth: 2, borderColor: 'transparent' },
  // Coins arrondis proches de ceux d’iOS pour une icône de cette taille.
  icon: { width: ICON, height: ICON, borderRadius: ICON * 0.225 },
  lock: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  label: { fontSize: fontSize.micro + 1, fontWeight: '700' },
}));
