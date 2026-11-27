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

/*
 * Couleurs d’illustration des médailles (comme le dessin de la mascotte) : elles font partie de l’objet,
 * elles ne suivent ni le thème ni l’accent.
 */

interface Metal {
  /** Contour : clair → moyen → sombre (lumière en haut à gauche). */
  rim: [string, string, string];
}

/** Métal du contour : il dit la difficulté (bronze, argent, or, platine). */
const METALS: Record<MedalTier, Metal> = {
  bronze: { rim: ['#FBD7AE', '#C47A3C', '#6A3612'] },
  argent: { rim: ['#FFFFFF', '#C6CDD6', '#68737F'] },
  or: { rim: ['#FFF6CC', '#F0BC3A', '#8A5A08'] },
  platine: { rim: ['#F6FFFD', '#B7E3DA', '#3F7B71'] },
};

/** Émail de la face : il dit la famille (produits sauvés, séries, cuisine, impact). */
const ENAMELS: Record<MedalShape, [string, string]> = {
  cercle: ['#5FD59A', '#167A4D'],
  hexagone: ['#FFB65C', '#C2470E'],
  octogone: ['#FF7A8A', '#A8162F'],
  rosace: ['#6FB6FF', '#1E4FA8'],
};

/** Médaille pas encore gagnée : disque de verre givré, sans couleur. */
const LOCKED_LIGHT = {
  rim: ['#FBFBF9', '#D9DBD6', '#A5A8A2'] as [string, string, string],
  face: ['#F4F5F2', '#D2D5CF'] as [string, string],
  icon: '#9A9D97',
};
const LOCKED_DARK = {
  rim: ['#6C7169', '#474C45', '#2C302B'] as [string, string, string],
  face: ['#545951', '#383C36'] as [string, string],
  icon: '#8A9088',
};

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

/**
 * Médaille des badges, dessinée en SVG à la manière des récompenses d’Apple Fitness : une vraie pièce,
 * avec sa tranche et son ombre, un contour de métal poli (le rang), des gravures fines, une face
 * émaillée vernie de la couleur de la famille et un pictogramme en métal repoussé. Une médaille pas
 * encore gagnée est un disque de verre givré, avec son anneau d’avancement.
 */
export function Medal({ tier, shape, icon, achieved, size, progress, shine = false, sheen, back = false }: MedalProps) {
  const { isDark, colors } = useTheme();
  const reduced = useReducedMotion();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const locked = isDark ? LOCKED_DARK : LOCKED_LIGHT;
  const metal = achieved ? METALS[tier] : { rim: locked.rim };
  const enamel = achieved ? ENAMELS[shape] : locked.face;

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
          {/* Métal poli : bandes de reflet (clair, sombre, reflet secondaire), comme une pièce sous la lumière. */}
          <LinearGradient id={`rim${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={metal.rim[0]} />
            <Stop offset="0.28" stopColor={metal.rim[1]} />
            <Stop offset="0.5" stopColor={metal.rim[2]} />
            <Stop offset="0.72" stopColor={metal.rim[1]} />
            <Stop offset="0.86" stopColor={metal.rim[0]} />
            <Stop offset="1" stopColor={metal.rim[2]} />
          </LinearGradient>
          <LinearGradient id={`bevel${id}`} x1="1" y1="1" x2="0" y2="0">
            <Stop offset="0" stopColor={metal.rim[0]} />
            <Stop offset="0.5" stopColor={metal.rim[1]} />
            <Stop offset="1" stopColor={metal.rim[2]} />
          </LinearGradient>
          <RadialGradient id={`enamel${id}`} cx="0.36" cy="0.28" r="0.85">
            <Stop offset="0" stopColor={enamel[0]} />
            <Stop offset="1" stopColor={enamel[1]} />
          </RadialGradient>
          {/* Vernis de l’émail : lumière en diagonale depuis le haut à gauche. */}
          <LinearGradient id={`gloss${id}`} x1="0" y1="0" x2="0.8" y2="0.9">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.42} />
            <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity={0.06} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
          {/* Reflet du métal : une tache de lumière qui s’estompe, sans bord net. */}
          <RadialGradient id={`spec${id}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id={`shine${id}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.7} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
          <ClipPath id={`clip${id}`}>
            <Outline shape={shape} r={45} />
          </ClipPath>
          <ClipPath id={`face${id}`}>
            <Outline shape={shape} r={34} />
          </ClipPath>
        </Defs>

        {/* Ombre portée douce sous la pièce */}
        {achieved ? <Ellipse cx={50} cy={95} rx={28} ry={3} fill="#000000" opacity={0.16} /> : null}

        <G opacity={achieved ? 1 : 0.7} transform="translate(0 -2)">
          {/* Tranche de la pièce : la même forme, plus sombre, décalée vers le bas (épaisseur) */}
          <G transform="translate(0 3.5)">
            <Outline shape={shape} r={45} fill={metal.rim[2]} />
          </G>

          {/* Contour de métal poli */}
          <Outline shape={shape} r={45} fill={`url(#rim${id})`} />
          {/* Gravure : filet sombre puis filet clair, entre le contour et le biseau */}
          <Outline shape={shape} r={40.6} fill="none" stroke={metal.rim[2]} strokeOpacity={0.6} strokeWidth={1} />
          <Outline shape={shape} r={39.6} fill="none" stroke={metal.rim[0]} strokeOpacity={0.8} strokeWidth={0.8} />
          {/* Biseau, éclairé à l’inverse du contour : la face paraît enfoncée */}
          <Outline shape={shape} r={39} fill={`url(#bevel${id})`} />

          {/* Face émaillée, vernis et cerclage de métal */}
          <Outline shape={shape} r={34} fill={`url(#enamel${id})`} />
          <G clipPath={`url(#face${id})`}>
            <Outline shape={shape} r={34} fill="none" stroke="#000000" strokeOpacity={achieved ? 0.25 : 0.1} strokeWidth={4} />
            <Outline shape={shape} r={34} fill={`url(#gloss${id})`} />
          </G>
          <Outline shape={shape} r={34} fill="none" stroke={metal.rim[0]} strokeOpacity={0.9} strokeWidth={1.1} />

          {/* Reflet bombé du métal et reflet animé */}
          <G clipPath={`url(#clip${id})`}>
            <Ellipse cx={40} cy={20} rx={30} ry={14} fill={`url(#spec${id})`} opacity={achieved ? 0.9 : 0.7} />
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
        <View style={styles.iconLayer} pointerEvents="none">
          {achieved ? (
            <>
              {/* Pictogramme en métal repoussé : ombre en bas, lumière en haut, puis le métal. */}
              <Ionicons name={icon} size={size * 0.3} color="rgba(0,0,0,0.38)" style={styles.embossShadow} />
              <Ionicons name={icon} size={size * 0.3} color="rgba(255,255,255,0.55)" style={styles.embossLight} />
              <Ionicons name={icon} size={size * 0.3} color={metal.rim[0]} style={styles.icon} />
            </>
          ) : (
            <Ionicons name={icon} size={size * 0.3} color={locked.icon} style={styles.icon} />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  iconLayer: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  embossShadow: { position: 'absolute', transform: [{ translateY: -0.4 }, { translateX: 0.6 }] },
  embossLight: { position: 'absolute', transform: [{ translateY: -2.6 }, { translateX: -0.6 }] },
  // La pièce est remontée de 2 unités (sa tranche dépasse en bas) : le pictogramme suit.
  icon: { position: 'absolute', transform: [{ translateY: -1.6 }] },
});

/**
 * Tranche de la médaille : la même forme, pleine, en métal plus sombre. Empilée en plusieurs couches
 * entre la face et le revers, elle donne son épaisseur à la médaille quand on la fait tourner.
 */
export function MedalEdge({ tier, shape, size }: { tier: MedalTier; shape: MedalShape; size: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const metal = METALS[tier];
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`edge${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={metal.rim[1]} />
          <Stop offset="0.5" stopColor={metal.rim[2]} />
          <Stop offset="1" stopColor={metal.rim[1]} />
        </LinearGradient>
      </Defs>
      <G transform="translate(0 -2)">
        <Outline shape={shape} r={45} fill={`url(#edge${id})`} />
      </G>
    </Svg>
  );
}
