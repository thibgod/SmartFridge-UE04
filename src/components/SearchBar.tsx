import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { MIN_TOUCH, PRESSED, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder = 'Rechercher un produit' }: SearchBarProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={19} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        style={styles.input}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="never"
        accessibilityLabel={placeholder}
        keyboardAppearance="default"
      />
      {value ? (
        // La croix d’effacement apparaît et s’efface en fondu, sans saut.
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(180)}>
          <Pressable
            style={({ pressed }) => pressed && PRESSED}
            onPress={() => onChangeText('')}
            accessibilityRole="button"
            accessibilityLabel="Effacer la recherche"
            hitSlop={12}
          >
            <Ionicons name="close-circle" size={19} color={colors.textSubtle} />
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
  },
  input: { flex: 1, fontSize: fontSize.body, color: colors.text, paddingVertical: spacing.sm },
}));
