import type { Tabs } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CHROME_FONT_SCALE, makeStyles, spacing, useTheme } from '@/theme';
import { concentricRadius, glassRadius, glassSpring, TAB_BAR, tabBarBottomGap } from '@/theme/liquidGlass';
import { haptics } from '@/utils/haptics';

import { GlassSurface } from './GlassSurface';
import { useTabBarCollapseProgress } from './TabBarCollapse';
import { useLensScrub } from './useLensScrub';
import { useGlass } from './useGlass';

export type GlassTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

// Capsule allongée comme dans Apple Music : aussi large que l’onglet, moins haute que la barre
// (une bulle aussi haute que large paraîtrait ronde).
const LENS_INSET_X = 2;
const LENS_INSET_Y = 6;
const BAR_MAX_WIDTH = 460;
const LABEL_HEIGHT = 14;

/** Distance entre le bas de l’écran et le haut de la barre flottante (dépliée). */
export function useGlassTabBarTop(): number {
  const { bottom } = useSafeAreaInsets();
  return TAB_BAR.height + tabBarBottomGap(bottom);
}

/**
 * Espace à laisser sous le contenu défilant (et sous les boutons flottants) pour qu’il ne finisse pas
 * caché derrière la barre : le haut de la barre plus une petite respiration.
 */
export function useGlassTabBarInset(): number {
  return useGlassTabBarTop() + spacing.md;
}

/**
 * Barre d’onglets flottante en verre, pour `<Tabs tabBar={(props) => <GlassTabBar {...props} />}>`.
 * Le contenu défile dessous ; une goutte de verre teintée glisse d’onglet en onglet en s’étirant. Quand on
 * fait défiler vers le bas, la barre se réduit (libellés masqués) et se déplie dès qu’on remonte, comme
 * sur iOS 26 (voir `useCollapseTabBarOnScroll`). Reprend les options des onglets : icône, libellé,
 * pastille, libellé d’accessibilité.
 */
export function GlassTabBar({ state, descriptors, navigation, insets }: GlassTabBarProps) {
  const { colors } = useTheme();
  const { glass } = useGlass();
  const styles = useStyles();
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const count = state.routes.length;
  const itemWidth = width / Math.max(1, count);
  const fallbackProgress = useSharedValue(0);
  const collapse = useTabBarCollapseProgress() ?? fallbackProgress;

  const position = useSharedValue(state.index);
  const stretch = useSharedValue(1);
  const lift = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) {
      position.set(state.index);
      return;
    }
    position.set(withSpring(state.index, glassSpring.morph));
    // La goutte s’étire pendant le déplacement puis reprend sa forme avec un léger rebond.
    stretch.set(withSequence(withTiming(1.14, { duration: 110 }), withSpring(1, glassSpring.release)));
  }, [state.index, reducedMotion, position, stretch]);

  const barStyle = useAnimatedStyle(() => ({
    height: interpolate(collapse.get(), [0, 1], [TAB_BAR.height, TAB_BAR.compactHeight]),
    // Le doigt tient la barre : elle se dilate légèrement, comme sur iOS 26.
    transform: [{ scale: 1 + 0.03 * lift.get() }],
  }));

  // Glisser le doigt sur la barre : la goutte le suit et l’onglet sous le doigt s’ouvre au relâchement.
  const routes = state.routes;
  const currentIndex = state.index;
  const selectTab = useCallback(
    (index: number) => {
      const route = routes[index];
      if (!route) return;
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (index !== currentIndex && !event.defaultPrevented) navigation.navigate(route.name, route.params);
    },
    [routes, currentIndex, navigation],
  );
  const scrub = useLensScrub({ count, itemWidth, position, lift, onSelect: selectTab });

  const lensStyle = useAnimatedStyle(() => ({
    width: Math.max(0, itemWidth - LENS_INSET_X * 2),
    transform: [
      { translateX: position.get() * itemWidth + LENS_INSET_X },
      // Tenue sous le doigt, la bulle grossit et déborde de la barre, comme une loupe de verre.
      { scaleX: stretch.get() * (1 + 0.3 * lift.get()) },
      { scaleY: 1 + 0.28 * lift.get() },
    ],
  }));

  return (
    <View pointerEvents="box-none" style={[styles.container, { paddingBottom: tabBarBottomGap(insets.bottom) }]}>
      <GestureDetector gesture={scrub}>
        <Animated.View style={[styles.barFrame, barStyle]}>
          <GlassSurface
            material="thick"
            radius={glassRadius.bar}
            elevation="high"
            style={styles.bar}
            onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            accessibilityRole="tablist"
          >
            {width > 0 ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.lens,
                  {
                    backgroundColor: glass.tabLens,
                    borderTopColor: glass.rimLight,
                    borderLeftColor: glass.rimLight,
                    borderBottomColor: glass.rimShade,
                    borderRightColor: glass.rimShade,
                  },
                  lensStyle,
                ]}
              />
            ) : null}
            {state.routes.map((route, index) => {
              const options = descriptors[route.key]?.options ?? {};
              const focused = state.index === index;
              const color = focused ? colors.primary : colors.textMuted;
              const label = typeof options.tabBarLabel === 'string' ? options.tabBarLabel : (options.title ?? route.name);

              const onPress = () => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  haptics.select();
                  navigation.navigate(route.name, route.params);
                }
              };

              return (
                <TabItem
                  key={route.key}
                  focused={focused}
                  label={label}
                  color={color}
                  badge={options.tabBarBadge}
                  accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                  icon={options.tabBarIcon?.({ focused, color, size: 26 })}
                  collapse={collapse}
                  onPress={onPress}
                  onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
                />
              );
            })}
          </GlassSurface>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

interface TabItemProps {
  focused: boolean;
  label: string;
  color: string;
  badge: string | number | undefined;
  accessibilityLabel: string;
  icon: ReactNode;
  collapse: SharedValue<number>;
  onPress: () => void;
  onLongPress: () => void;
}

function TabItem({ focused, label, color, badge, accessibilityLabel, icon, collapse, onPress, onLongPress }: TabItemProps) {
  const styles = useStyles();
  const reducedMotion = useReducedMotion();
  const bounce = useSharedValue(1);
  const wasFocused = useRef(focused);

  // L’icône choisie s’enfonce puis rebondit : on sent l’onglet « s’allumer ».
  useEffect(() => {
    if (focused && !wasFocused.current && !reducedMotion) {
      bounce.set(withSequence(withTiming(0.82, { duration: 90 }), withSpring(1, glassSpring.release)));
    }
    wasFocused.current = focused;
  }, [focused, reducedMotion, bounce]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: bounce.get() }] }));
  // Barre réduite : le libellé s’efface et libère sa hauteur, l’icône se recentre.
  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(collapse.get(), [0, 0.6], [1, 0], Extrapolation.CLAMP),
    height: interpolate(collapse.get(), [0, 1], [LABEL_HEIGHT, 0]),
  }));

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <Animated.View style={iconStyle}>
        {icon}
        {badge !== undefined ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText} maxFontSizeMultiplier={CHROME_FONT_SCALE} numberOfLines={1}>
              {badge}
            </Text>
          </View>
        ) : null}
      </Animated.View>
      <Animated.View style={[styles.labelBox, labelStyle]}>
        <Text style={[styles.label, { color }]} numberOfLines={1} maxFontSizeMultiplier={CHROME_FONT_SCALE}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  container: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: spacing.lg },
  barFrame: { width: '100%', maxWidth: BAR_MAX_WIDTH },
  bar: { flex: 1, flexDirection: 'row' },
  // Goutte de verre teintée par l’accent, avec un liseré lumineux en haut à gauche.
  lens: {
    position: 'absolute',
    top: LENS_INSET_Y,
    bottom: LENS_INSET_Y,
    left: 0,
    borderRadius: concentricRadius(glassRadius.bar, LENS_INSET_Y),
    borderWidth: 1,
    borderColor: 'transparent',
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  itemPressed: { transform: [{ scale: 0.92 }] },
  labelBox: { overflow: 'hidden', justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: -4,
    left: 16,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.onPrimary, fontSize: 11, fontWeight: '700' },
}));
