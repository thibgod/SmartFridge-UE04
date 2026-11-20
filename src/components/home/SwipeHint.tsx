import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { CHROME_FONT_SCALE, PRESSED, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';

interface SwipeHintProps {
  onDismiss: () => void;
}

/**
 * Astuce du premier usage : montre le geste avec les mêmes couleurs que les panneaux révélés
 * (vert à droite, rouge à gauche). Elle disparaît en fondu une fois comprise ou le geste utilisé.
 */
export function SwipeHint({ onDismiss }: SwipeHintProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <Animated.View entering={FadeIn.duration(240)} exiting={FadeOut.duration(220)} style={styles.card}>
      <View style={styles.top}>
        <Ionicons name="hand-left-outline" size={18} color={colors.primary} />
        <Text style={styles.title}>
          Glissez un produit<Text style={styles.text}>, puis touchez l’action</Text>
        </Text>
        <Pressable
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Fermer l’astuce"
          hitSlop={10}
          style={({ pressed }) => [styles.ok, pressed && PRESSED]}
        >
          <Text style={styles.okText}>Compris</Text>
        </Pressable>
      </View>
      <View style={styles.gestures}>
        <View style={styles.gesture}>
          <Ionicons name="arrow-forward" size={16} color={colors.success} />
          <Text style={[styles.gestureText, { color: colors.success }]} maxFontSizeMultiplier={CHROME_FONT_SCALE}>
            Consommé
          </Text>
        </View>
        <View style={styles.gesture}>
          <Ionicons name="arrow-back" size={16} color={colors.danger} />
          <Text style={[styles.gestureText, { color: colors.danger }]} maxFontSizeMultiplier={CHROME_FONT_SCALE}>
            Jeté
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    paddingTop: spacing.sm + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: fontSize.body, fontWeight: '800', color: colors.text },
  ok: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  okText: { fontSize: fontSize.body, fontWeight: '800', color: colors.primary },
  gestures: { flexDirection: 'row', gap: spacing.sm },
  gesture: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.xs + 3,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  gestureText: { fontSize: fontSize.caption + 1, fontWeight: '800' },
  text: { fontWeight: '500', color: colors.textMuted },
}));
