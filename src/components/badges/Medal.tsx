import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

import { polygonPoints, type MedalShape, type MedalTier } from '@/features/achievements/medals';
import { useTheme } from '@/theme';
import type { IconName } from '@/types/content';

const AnimatedRect = Animated.createAnimatedComponent(Rect);
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

interface Palette {
  rim: [string, string, string];
  face: [string, string];
  icon: string;
}

/** Métaux « brossés » : un dégradé clair → sombre pour le contour, un autre, inversé, pour le biseau. */
const METALS: Record<MedalTier, Palette> = {
  bronze: { rim: ['#F8CFA2', '#C27A3E', '#6E3A15'], face: ['#EDB27A', '#9C5826'], icon: '#5A2C0E' },
  argent: { rim: ['#FFFFFF', '#C3CAD2', '#6F7A86'], face: ['#EEF1F4', '#9AA5B0'], icon: '#434D58' },
  or: { rim: ['#FFF3C4', '#EDBA3F', '#8E5D0C'], face: ['#FFE08A', '#C8891B'], icon: '#664104' },
  platine: { rim: ['#F4FCFA', '#B3DDD5', '#477F76'], face: ['#DDF2EE', '#80B9AF'], icon: '#264F48' },
};
const LOCKED_LIGHT: Palette = { rim: ['#F1F1EE', '#CBCDC8', '#9C9F99'], face: ['#E2E3DF', '#B9BCB6'], icon: '#8E918B' };
const LOCKED_DARK: Palette = { rim: ['#62675F', '#41463F', '#2B2F2A'], face: ['#4B5049', '#343832'], icon: '#80867E' };

interface MedalProps {
  tier: MedalTier;
  shape: MedalShape;
  icon: IconName;
  achieved: boolean;
  size: number;
  /** Badge pas encore obtenu : avancement 0–1, dessiné en anneau autour de la médaille. */
  progress?: number;
  /** Reflet qui traverse la médaille une fois, à l'apparition (badge tout juste obtenu). */
  shine?: boolean;
  /** Reflet piloté de l'extérieur (0–1), par exemple par la rotation au doigt sur la fiche. */
  sheen?: SharedValue<number>;
  /** Revers de la médaille : pas d'icône, le texte gravé est posé par-dessus. */
  back?: boolean;
}

function Outline({ shape, r, ...rest }: { shape: MedalShape; r: number } & Record<string, unknown>) {
  if (shape === 'cercle') return <Circle cx={50} cy={50} r={r} {...rest} />;
  if (shape === 'hexagone') return <Polygon points={polygonPoints(6, 50, 50, r)} strokeLinejoin="round" {...rest} />;
  if (shape === 'octogone') return <Polygon points={polygonPoints(8, 50, 50, r)} strokeLinejoin="round" {...rest} />;
  return <Polygon points={polygonPoints(16, 50, 50, r, r * 0.92)} strokeLinejoin="round" {...rest} />;
}

/** Médaille des badges du Bilan, dessinée en SVG : contour métallique, biseau, face bombée, icône gravée. */
export function Medal({ tier, shape, icon, achieved, size, progress, shine = false, sheen, back = false }: MedalProps) {
  const { isDark, colors } = useTheme();
  const reduced = useReducedMotion();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const palette = achieved ? METALS[tier] : isDark ? LOCKED_DARK : LOCKED_LIGHT;

  // Reflet : un aller unique à l'apparition, ou suivi de la rotation quand la fiche le fournit.
  const ownSheen = useSharedValue(0);
  useEffect(() => {
    if (!shine || reduced || sheen) return;
    ownSheen.set(0);
    ownSheen.set(withDelay(250, withTiming(1, { duration: 1100, easing: EASE_IN_OUT })));
  }, [shine, reduced, sheen, ownSheen]);
  const shineProps = useAnimatedProps(() => {
    const p = sheen ? sheen.get() : ownSheen.get();
    return { x: -45 + p * 190, opacity: p <= 0 || p >= 1 ? 0 : 1 };
  });
  const showShine = achieved && (shine || sheen !== undefined) && !reduced;

  const ring = !achieved && progress !== undefined && progress > 0;
  const circumference = 2 * Math.PI * 49;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id={`rim${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={palette.rim[0]} />
            <Stop offset="0.5" stopColor={palette.rim[1]} />
            <Stop offset="1" stopColor={palette.rim[2]} />
          </LinearGradient>
          <LinearGradient id={`bevel${id}`} x1="1" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={palette.rim[0]} />
            <Stop offset="0.55" stopColor={palette.rim[1]} />
            <Stop offset="1" stopColor={palette.rim[2]} />
          </LinearGradient>
          <RadialGradient id={`face${id}`} cx="0.38" cy="0.3" r="0.8">
            <Stop offset="0" stopColor={palette.face[0]} />
            <Stop offset="1" stopColor={palette.face[1]} />
          </RadialGradient>
          <LinearGradient id={`shine${id}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.65} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
          <ClipPath id={`clip${id}`}>
            <Outline shape={shape} r={47} />
          </ClipPath>
        </Defs>

        {/* Médaille pas encore gagnée : grise et estompée, pour ne jamais la confondre avec l'argent. */}
        <G opacity={achieved ? 1 : 0.55}>
          <Outline shape={shape} r={47} fill={`url(#rim${id})`} />
          <Outline shape={shape} r={42} fill={`url(#bevel${id})`} />
          <Outline shape={shape} r={38} fill={`url(#face${id})`} />
          <Outline shape={shape} r={33} fill="none" stroke={palette.icon} strokeOpacity={0.22} strokeWidth={1} />
          <G clipPath={`url(#clip${id})`}>
            <Ellipse cx={46} cy={28} rx={30} ry={14} fill="#FFFFFF" opacity={achieved ? 0.28 : 0.18} />
            {showShine ? (
              <G rotation={22} origin="50, 50">
                <AnimatedRect animatedProps={shineProps} y={-20} width={22} height={140} fill={`url(#shine${id})`} />
              </G>
            ) : null}
          </G>
        </G>

        {ring ? (
          <G rotation={-90} origin="50, 50">
            <Circle cx={50} cy={50} r={49} fill="none" stroke={colors.surfaceMuted} strokeWidth={2} />
            <Circle
              cx={50}
              cy={50}
              r={49}
              fill="none"
              stroke={colors.primary}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeDasharray={`${circumference * Math.min(1, progress)} ${circumference}`}
            />
          </G>
        ) : null}
      </Svg>

      {back ? null : (
        <View style={[styles.iconLayer, !achieved && styles.dimmed]} pointerEvents="none">
          {/* Icône « gravée » : un liseré clair décalé sous l'icône sombre. */}
          <Ionicons name={icon} size={size * 0.34} color="rgba(255,255,255,0.55)" style={styles.engraveLight} />
          <Ionicons name={icon} size={size * 0.34} color={palette.icon} style={styles.engrave} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  iconLayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  engraveLight: { position: 'absolute', transform: [{ translateY: 1 }] },
  engrave: { position: 'absolute' },
  dimmed: { opacity: 0.6 },
});
