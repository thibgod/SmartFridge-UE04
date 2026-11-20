import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  /** 0 à 1. */
  value: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  children?: ReactNode;
}

/** Anneau de progression animé (score anti-gaspi), contenu centré à l’intérieur. */
export function ProgressRing({ value, size = 132, strokeWidth = 12, color, children }: ProgressRingProps) {
  const { colors } = useTheme();
  const [progress] = useState(() => new Animated.Value(0));
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, value));
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    // « Réduire les animations » : l’anneau se pose directement sur sa valeur.
    if (reduceMotion) {
      progress.setValue(clamped);
      return;
    }
    Animated.timing(progress, {
      toValue: clamped,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clamped, progress, reduceMotion]);

  const dashOffset = progress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceMuted} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashOffset}
        />
      </Svg>
      {children}
    </View>
  );
}
