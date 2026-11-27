import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { Segment } from '@/components/ui/SegmentedControl';
import { CHROME_FONT_SCALE, fontSize, makeStyles, spacing, useTheme } from '@/theme';
import { concentricRadius, glassRadius, glassSpring } from '@/theme/liquidGlass';
import { haptics } from '@/utils/haptics';

import { GlassSurface } from './GlassSurface';
import { useGlass } from './useGlass';
import { useLensScrub } from './useLensScrub';

interface GlassSegmentedControlProps<T extends string> {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}

const HEIGHT = 46;
const INSET = 3;

/**
 * Choix exclusif sur une capsule de verre : même interface que `SegmentedControl`. La pastille du
 * segment choisi glisse et s’étire comme une goutte ; on peut aussi garder le doigt sur la capsule et
 * glisser : la goutte suit le doigt et le segment sous le doigt est choisi au relâchement.
 */
export function GlassSegmentedControl<T extends string>({ segments, value, onChange }: GlassSegmentedControlProps<T>) {
  const { colors } = useTheme();
  const { glass } = useGlass();
  const styles = useStyles();
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    segments.findIndex((segment) => segment.value === value),
  );
  const itemWidth = (width - INSET * 2) / Math.max(1, segments.length);

  const position = useSharedValue(index);
  const stretch = useSharedValue(1);
  const lift = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) {
      position.set(index);
      return;
    }
    position.set(withSpring(index, glassSpring.morph));
    stretch.set(withSequence(withTiming(1.1, { duration: 110 }), withSpring(1, glassSpring.release)));
  }, [index, reducedMotion, position, stretch]);

  const selectAt = useCallback(
    (next: number) => {
      const segment = segments[next];
      if (segment && segment.value !== value) onChange(segment.value);
    },
    [segments, value, onChange],
  );
  const scrub = useLensScrub({ count: segments.length, itemWidth, inset: INSET, position, lift, onSelect: selectAt });

  const lensStyle = useAnimatedStyle(() => ({
    width: Math.max(0, itemWidth),
    transform: [
      { translateX: INSET + position.get() * itemWidth },
      { scaleX: stretch.get() * (1 + 0.22 * lift.get()) },
      { scaleY: 1 + 0.3 * lift.get() },
    ],
  }));

  return (
    <GestureDetector gesture={scrub}>
      <View collapsable={false}>
        <GlassSurface
          material="regular"
          radius={glassRadius.pill}
          elevation="none"
          style={styles.track}
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
          accessibilityRole="tablist"
        >
          {width > 0 ? (
            // Pastille plus claire que le verre : on la lit comme une goutte posée dessus.
            <Animated.View
              pointerEvents="none"
              style={[styles.lens, { backgroundColor: glass.lens, boxShadow: glass.lensShadow }, lensStyle]}
            />
          ) : null}
          {segments.map((segment) => {
            const selected = segment.value === value;
            const fg = selected ? colors.text : colors.textMuted;
            return (
              <Pressable
                key={segment.value}
                onPress={() => {
                  if (!selected) haptics.select();
                  onChange(segment.value);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={segment.accessibilityLabel ?? segment.label}
                style={({ pressed }) => [styles.segment, pressed && styles.pressed]}
              >
                {segment.icon ? <Ionicons name={segment.icon} size={15} color={selected ? colors.primary : fg} /> : null}
                <Text
                  style={[styles.label, { color: fg }, selected && styles.labelSelected]}
                  numberOfLines={1}
                  maxFontSizeMultiplier={CHROME_FONT_SCALE}
                >
                  {segment.label}
                </Text>
                {segment.count !== undefined ? (
                  <Text style={[styles.count, selected && styles.countSelected]} maxFontSizeMultiplier={CHROME_FONT_SCALE}>
                    {segment.count}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </GlassSurface>
      </View>
    </GestureDetector>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  track: { flexDirection: 'row', height: HEIGHT, padding: INSET },
  lens: {
    position: 'absolute',
    top: INSET,
    bottom: INSET,
    left: 0,
    borderRadius: concentricRadius(HEIGHT / 2, INSET),
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  pressed: { opacity: 0.6 },
  label: { fontSize: fontSize.caption + 1, fontWeight: '600', flexShrink: 1 },
  labelSelected: { fontWeight: '800' },
  count: { fontSize: fontSize.micro, fontWeight: '700', color: colors.textSubtle },
  countSelected: { color: colors.primary },
}));
