import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { FadeOut, useReducedMotion } from 'react-native-reanimated';

import { expiryColors } from '@/components/ExpiryBadge';
import { FoodImage } from '@/components/FoodImage';
import { LOCATIONS } from '@/constants/catalog';
import { CHROME_FONT_SCALE, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { ClosedProductStatus, Product } from '@/types/product';
import { getCompactExpiryLabel, getExpiryInfo } from '@/utils/expiry';
import { haptics } from '@/utils/haptics';
import { formatRemaining } from '@/utils/remaining';

interface ProductRowProps {
  product: Product;
  urgentThreshold: number;
  onPress: (product: Product) => void;
  onClose: (product: Product, status: ClosedProductStatus) => void;
  /** Prévenu quand le panneau d’action s’ouvre ou se ferme (ex. masquer le bouton « + » qui le recouvrirait). */
  onSwipeChange?: (open: boolean) => void;
  /** Montre le geste une fois : la ligne s’entrouvre puis se referme (astuce du premier usage). */
  demo?: boolean;
}

const DEMO_DELAY_MS = 900;
const DEMO_HOLD_MS = 1100;

/**
 * Ligne produit compacte : photo, nom, statut lisible. Glisser vers la droite révèle « Consommé »,
 * vers la gauche « Jeté » : il faut ensuite toucher l’action, ce qui évite les validations par
 * mégarde (un simple bouton se touchait en faisant défiler). Le reste est dans la fiche produit.
 */
function ProductRowComponent({ product, urgentThreshold, onPress, onClose, onSwipeChange, demo = false }: ProductRowProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const expiry = getExpiryInfo(product.expiresAt, new Date(), urgentThreshold);
  const tone = expiryColors(colors, expiry.level);
  const location = LOCATIONS[product.location];
  const swipeable = useRef<SwipeableMethods>(null);
  const isOpen = useRef(false);
  const notify = (open: boolean) => {
    if (isOpen.current === open) return;
    isOpen.current = open;
    onSwipeChange?.(open);
  };
  // Ligne retirée alors qu’elle était ouverte (produit consommé) : on le signale quand même.
  // (onSwipeChange est stable : créé avec useCallback par l’écran.)
  useEffect(
    () => () => {
      if (isOpen.current) onSwipeChange?.(false);
    },
    [onSwipeChange],
  );

  // Démonstration jouée une seule fois par montage, et jamais pendant que l’utilisateur agit déjà.
  const demoPlayed = useRef(false);
  // Un mouvement que l’utilisateur n’a pas lancé : jamais avec « Réduire les animations ».
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!demo || demoPlayed.current || reduceMotion) return;
    demoPlayed.current = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(
      setTimeout(() => {
        if (isOpen.current) return;
        swipeable.current?.openLeft();
        timers.push(setTimeout(() => swipeable.current?.close(), DEMO_HOLD_MS));
      }, DEMO_DELAY_MS),
    );
    return () => timers.forEach(clearTimeout);
  }, [demo, reduceMotion]);

  const act = (status: ClosedProductStatus) => {
    swipeable.current?.close();
    onClose(product, status);
  };

  const action = (status: ClosedProductStatus) => {
    const consumed = status === 'consumed';
    return (
      <Pressable
        onPress={() => act(status)}
        accessibilityRole="button"
        accessibilityLabel={consumed ? `Marquer ${product.name} comme consommé` : `Marquer ${product.name} comme jeté`}
        style={({ pressed }) => [
          styles.swipeAction,
          consumed ? styles.swipeLeft : styles.swipeRight,
          { backgroundColor: consumed ? colors.success : colors.danger },
          pressed && styles.swipePressed,
        ]}
      >
        <Ionicons name={consumed ? 'checkmark-circle' : 'trash'} size={22} color={colors.onPrimary} />
        <Text style={styles.swipeText}>{consumed ? 'Consommé' : 'Jeté'}</Text>
      </Pressable>
    );
  };

  return (
    // Fondu quand la ligne quitte la liste (consommé, jeté ou filtré) : les suivantes remontent en douceur.
    <Animated.View exiting={FadeOut.duration(220)} style={styles.swipeContainer}>
      <ReanimatedSwipeable
        ref={swipeable}
        friction={1.6}
        leftThreshold={48}
        rightThreshold={48}
        overshootLeft={false}
        overshootRight={false}
        renderLeftActions={() => action('consumed')}
        renderRightActions={() => action('discarded')}
        containerStyle={styles.swipeClip}
        onSwipeableWillOpen={() => {
          // Le panneau « cranne » : un léger déclic, au moment même où il s’enclenche.
          if (!isOpen.current) haptics.select();
          notify(true);
        }}
        onSwipeableWillClose={() => notify(false)}
      >
        <Pressable
          onPress={() => onPress(product)}
          accessibilityRole="button"
          accessibilityLabel={`${product.name}, ${expiry.label}, ${location.label}`}
          accessibilityHint="Ouvre la fiche du produit. Glissez vers la droite pour « consommé », vers la gauche pour « jeté »."
          accessibilityActions={[
            { name: 'consumed', label: 'Consommé' },
            { name: 'discarded', label: 'Jeté' },
          ]}
          onAccessibilityAction={(event) =>
            onClose(product, event.nativeEvent.actionName === 'consumed' ? 'consumed' : 'discarded')
          }
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <FoodImage name={product.name} category={product.category} uri={product.imageUri} size={52} radius={radius.md} />

          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {product.name}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons name={location.icon} size={13} color={colors.textMuted} />
              <Text style={styles.meta} numberOfLines={1}>
                {location.label}
                {product.quantity ? ` · ${product.quantity}` : ''}
                {product.remaining ? ` · reste ${formatRemaining(product.remaining)}` : product.openedAt ? ' · entamé' : ''}
              </Text>
            </View>
          </View>

          <View style={[styles.pill, { backgroundColor: tone.bg }]}>
            {expiry.level === 'ok' ? null : <Ionicons name={tone.icon} size={13} color={tone.fg} />}
            <Text style={[styles.pillText, { color: tone.fg }]} numberOfLines={1} maxFontSizeMultiplier={CHROME_FONT_SCALE}>
              {getCompactExpiryLabel(expiry.days)}
            </Text>
          </View>
        </Pressable>
      </ReanimatedSwipeable>
    </Animated.View>
  );
}

export const ProductRow = memo(ProductRowComponent);

const useStyles = makeStyles(({ colors, shadow }) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm + 2,
    paddingRight: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow,
  },
  pressed: { backgroundColor: colors.surfaceMuted },
  info: { flex: 1, gap: 4 },
  name: {
    fontSize: fontSize.bodyLarge - 1,
    fontWeight: '700',
    color: colors.text,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { flex: 1, fontSize: fontSize.caption, color: colors.textMuted },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minWidth: 58,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
  },
  pillText: { fontSize: fontSize.caption, fontWeight: '800', fontVariant: ['tabular-nums'] },
  swipeContainer: { marginBottom: spacing.sm },
  swipeClip: { borderRadius: radius.lg },
  swipeAction: {
    width: 112,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  swipeLeft: {
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
    marginRight: -radius.lg,
    paddingRight: radius.lg,
  },
  swipeRight: {
    borderTopRightRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    marginLeft: -radius.lg,
    paddingLeft: radius.lg,
  },
  swipePressed: { opacity: 0.85 },
  swipeText: {
    fontSize: fontSize.caption,
    fontWeight: '800',
    color: colors.onPrimary,
  },
}));
