import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { useGlassTabBarInset } from '@/components/glass';
import { PRESSED, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';

interface ToastProps {
  message: string;
  tone: 'success' | 'neutral' | 'error';
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
}

/** Place occupée par un toast (deux lignes) et sa marge : décalage des boutons flottants. */
export const TOAST_CLEARANCE = 80;

export function Toast({ message, tone, actionLabel, onAction, onDismiss }: ToastProps) {
  // Au-dessus de la barre d’onglets flottante (même hauteur réservée sur les autres écrans).
  const tabBarInset = useGlassTabBarInset();
  const { colors, shadowStrong } = useTheme();
  const styles = useStyles();
  const icon = tone === 'success' ? 'checkmark-circle' : tone === 'error' ? 'alert-circle' : 'information-circle';
  const iconColor = tone === 'error' ? colors.toastDanger : colors.toastAccent;

  return (
    // Monte du bas et y repart par le même chemin, en fondu : jamais de disparition sèche.
    <Animated.View
      entering={FadeInDown.duration(260).easing(Easing.out(Easing.cubic))}
      exiting={FadeOutDown.duration(220)}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.container, shadowStrong, { bottom: tabBarInset }]}
    >
      <Pressable
        onPress={onDismiss}
        style={({ pressed }) => [styles.body, pressed && PRESSED]}
        accessibilityLabel={message}
        accessibilityHint="Touchez pour fermer"
      >
        <Ionicons name={icon} size={22} color={iconColor} />
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </Pressable>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [styles.action, pressed && PRESSED]}
        >
          <Text style={styles.actionLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    maxWidth: 560,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.toast,
    borderRadius: radius.lg,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    minHeight: 56,
  },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  message: { flex: 1, color: colors.onToast, fontSize: fontSize.body, fontWeight: '500' },
  action: { paddingHorizontal: spacing.md, minHeight: 44, justifyContent: 'center' },
  actionLabel: { color: colors.toastAccent, fontSize: fontSize.body, fontWeight: '800' },
}));
