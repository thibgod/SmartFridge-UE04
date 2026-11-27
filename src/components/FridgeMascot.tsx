import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { useGlassTabBarTop } from '@/components/glass';
import { SpeechBubble, type BubbleAction } from '@/components/mascot/SpeechBubble';
import { TOAST_CLEARANCE } from '@/components/ui/Toast';
import { useToastVisible } from '@/features/feedback/ToastProvider';
import { mascotPose, subscribeMascotMood, type MascotFace, type MascotMood } from '@/features/mascot/mascot';
import type { MascotId } from '@/features/mascot/mascots';
import { useSettings } from '@/features/settings/SettingsProvider';
import {
  greetingLine,
  isTappingTooFast,
  reactionLine,
  readingTimeMs,
  shouldGreet,
  tapLine,
  TEASE_LINE,
  UNDO_WINDOW_MS,
  undoLine,
  type FridgeSnapshot,
  type Line,
} from '@/features/mascot/mascotLines';
import { useLayout } from '@/hooks/useLayout';
import { spacing } from '@/theme';
import { lightPalette } from '@/theme/tokens';
import { toLocalDateString } from '@/utils/date';
import { haptics } from '@/utils/haptics';

/** Couleurs fixes : la mascotte fait partie de l’identité, elle ne change ni en mode sombre ni avec l’accent. */
const colors = lightPalette;
const OUTLINE = colors.text;
const STROKE = 2.5;

/** Proportions du dessin (viewBox). */
const VIEW_W = 120;
const VIEW_H = 160;

const line = { stroke: OUTLINE, strokeWidth: STROKE, strokeLinecap: 'round', fill: 'none' } as const;

function Heart({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <Path
      d={`M${x} ${y + s * 0.9} C${x - s * 1.4} ${y} ${x - s * 0.7} ${y - s} ${x} ${y - s * 0.3} C${x + s * 0.7} ${y - s} ${x + s * 1.4} ${y} ${x} ${y + s * 0.9} Z`}
      fill={colors.danger}
    />
  );
}

/** Sourcils, yeux, joues et bouche selon l’humeur. */
function Face({ face }: { face: MascotFace }) {
  switch (face) {
    case 'happy':
      return (
        <G>
          <Path d="M41 35 Q46 30 51 34" {...line} />
          <Path d="M65 34 Q70 30 75 35" {...line} />
          {/* Yeux fermés de plaisir « ^ ^ » */}
          <Path d="M41 50 Q46 42 51 50" {...line} strokeWidth={3} />
          <Path d="M65 50 Q70 42 75 50" {...line} strokeWidth={3} />
          <Ellipse cx={39} cy={57} rx={6} ry={3.5} fill={colors.danger} fillOpacity={0.55} />
          <Ellipse cx={77} cy={57} rx={6} ry={3.5} fill={colors.danger} fillOpacity={0.55} />
          {/* Grand sourire ouvert */}
          <Path d="M49 57 Q58 72 67 57 Z" fill={OUTLINE} stroke={OUTLINE} strokeWidth={STROKE} strokeLinejoin="round" />
          <Ellipse cx={58} cy={64} rx={4} ry={2.2} fill={colors.danger} fillOpacity={0.8} />
          <Heart x={100} y={22} s={5} />
          <Heart x={108} y={36} s={3.5} />
        </G>
      );
    case 'angry':
      return (
        <G>
          {/* Sourcils froncés */}
          <Path d="M40 35 L52 41" {...line} strokeWidth={3} />
          <Path d="M64 41 L76 35" {...line} strokeWidth={3} />
          <Ellipse cx={46} cy={49} rx={5} ry={4.5} fill={OUTLINE} />
          <Ellipse cx={70} cy={49} rx={5} ry={4.5} fill={OUTLINE} />
          <Ellipse cx={39} cy={58} rx={6} ry={3.5} fill={colors.danger} fillOpacity={0.6} />
          <Ellipse cx={77} cy={58} rx={6} ry={3.5} fill={colors.danger} fillOpacity={0.6} />
          {/* Bouche boudeuse */}
          <Path d="M50 64 Q58 56 66 64" {...line} />
          {/* Symbole de colère au-dessus de la tête */}
          <G stroke={colors.danger} strokeWidth={2.6} strokeLinecap="round" fill="none">
            <Path d="M96 14 Q100 18 104 14" />
            <Path d="M96 26 Q100 22 104 26" />
            <Path d="M94 16 Q98 20 94 24" />
            <Path d="M106 16 Q102 20 106 24" />
          </G>
        </G>
      );
    case 'shocked':
      return (
        <G>
          <Path d="M41 33 Q46 28 51 32" {...line} />
          <Path d="M65 32 Q70 28 75 33" {...line} />
          {/* Yeux écarquillés */}
          <Circle cx={46} cy={47} r={7} fill={colors.surface} stroke={OUTLINE} strokeWidth={STROKE} />
          <Circle cx={70} cy={47} r={7} fill={colors.surface} stroke={OUTLINE} strokeWidth={STROKE} />
          <Circle cx={46} cy={47} r={2.2} fill={OUTLINE} />
          <Circle cx={70} cy={47} r={2.2} fill={OUTLINE} />
          {/* Bouche en « O » */}
          <Ellipse cx={58} cy={63} rx={4} ry={5} fill={OUTLINE} />
          {/* Traits de surprise */}
          <G {...line}>
            <Path d="M100 30 L108 24" />
            <Path d="M102 40 L112 38" />
            <Path d="M18 30 L10 24" />
          </G>
        </G>
      );
    case 'love':
      return (
        <G>
          <Path d="M41 37 Q46 32 51 36" {...line} />
          <Path d="M65 36 Q70 32 75 37" {...line} />
          {/* Yeux en cœur */}
          <Heart x={46} y={48} s={7} />
          <Heart x={70} y={48} s={7} />
          <Ellipse cx={38} cy={58} rx={6} ry={3.5} fill={colors.danger} fillOpacity={0.55} />
          <Ellipse cx={78} cy={58} rx={6} ry={3.5} fill={colors.danger} fillOpacity={0.55} />
          <Path d="M50 58 Q58 69 66 58 Z" fill={OUTLINE} stroke={OUTLINE} strokeWidth={STROKE} strokeLinejoin="round" />
          <Ellipse cx={58} cy={64} rx={3.5} ry={2} fill={colors.danger} fillOpacity={0.8} />
        </G>
      );
    case 'wink':
      return (
        <G>
          <Path d="M41 38 Q46 34 51 37" {...line} />
          <Path d="M65 34 Q70 29 75 33" {...line} />
          <Ellipse cx={46} cy={48} rx={5} ry={6} fill={OUTLINE} />
          <Circle cx={44} cy={46} r={2} fill={colors.surface} />
          {/* Clin d’œil */}
          <Path d="M64 49 Q70 44 76 49" {...line} strokeWidth={3} />
          <Ellipse cx={39} cy={58} rx={5} ry={3} fill={colors.danger} fillOpacity={0.45} />
          <Ellipse cx={77} cy={58} rx={5} ry={3} fill={colors.danger} fillOpacity={0.45} />
          <Path d="M50 59 Q59 67 67 57" {...line} />
        </G>
      );
    case 'sleepy':
      return (
        <G>
          <Path d="M41 41 Q46 39 51 41" {...line} />
          <Path d="M65 41 Q70 39 75 41" {...line} />
          {/* Paupières lourdes */}
          <Path d="M41 48 Q46 53 51 48" {...line} strokeWidth={3} />
          <Path d="M65 48 Q70 53 75 48" {...line} strokeWidth={3} />
          <Ellipse cx={39} cy={58} rx={5} ry={3} fill={colors.danger} fillOpacity={0.3} />
          <Ellipse cx={77} cy={58} rx={5} ry={3} fill={colors.danger} fillOpacity={0.3} />
          <Ellipse cx={58} cy={62} rx={3} ry={3.5} fill={OUTLINE} />
          {/* « z z », tracés à l’envers pour se lire à l’endroit une fois la mascotte retournée */}
          <G {...line} strokeWidth={2.2} strokeLinejoin="round">
            <Path d="M108 22 H100 L108 30 H100" />
            <Path d="M115 9 H109 L115 15 H109" />
          </G>
        </G>
      );
    case 'worried':
      return (
        <G>
          {/* Sourcils relevés au milieu */}
          <Path d="M41 37 L51 32" {...line} />
          <Path d="M65 32 L75 37" {...line} />
          <Ellipse cx={46} cy={48} rx={4.5} ry={5.5} fill={OUTLINE} />
          <Ellipse cx={70} cy={48} rx={4.5} ry={5.5} fill={OUTLINE} />
          <Circle cx={44.5} cy={46} r={1.8} fill={colors.surface} />
          <Circle cx={68.5} cy={46} r={1.8} fill={colors.surface} />
          <Path d="M50 63 Q54 60 58 63 Q62 66 66 63" {...line} />
          {/* Goutte de sueur */}
          <Path d="M87 30 Q82 38 87 42 Q92 38 87 30 Z" fill={colors.infoSoft} stroke={OUTLINE} strokeWidth={1.8} />
        </G>
      );
    default:
      return (
        <G>
          <Path d="M41 38 Q46 34 51 37" {...line} />
          <Path d="M65 37 Q70 34 75 38" {...line} />
          <Ellipse cx={46} cy={48} rx={5} ry={6} fill={OUTLINE} />
          <Ellipse cx={70} cy={48} rx={5} ry={6} fill={OUTLINE} />
          <Circle cx={44} cy={46} r={2} fill={colors.surface} />
          <Circle cx={68} cy={46} r={2} fill={colors.surface} />
          <Ellipse cx={39} cy={58} rx={5} ry={3} fill={colors.danger} fillOpacity={0.35} />
          <Ellipse cx={77} cy={58} rx={5} ry={3} fill={colors.danger} fillOpacity={0.35} />
          <Path d="M51 59 Q58 65 65 59" {...line} />
        </G>
      );
  }
}

interface FridgeMascotProps {
  /** Largeur en points ; la hauteur suit les proportions du dessin. */
  size?: number;
  face?: MascotFace;
  /** Personnage dessiné (Réglages › Apparence) ; le frigo par défaut. */
  kind?: MascotId;
}

/** Bras qui salue et main sur la hanche : communs à toutes les mascottes (même gabarit de 64 pt de large). */
function Arms() {
  return (
    <>
      {/* Bras qui salue : contour épais puis remplissage, pour un trait de dessin animé */}
      <G>
        <Path d="M27 74 Q14 70 13 56" stroke={OUTLINE} strokeWidth={10} strokeLinecap="round" fill="none" />
        <Path d="M27 74 Q14 70 13 56" stroke={colors.surface} strokeWidth={5} strokeLinecap="round" fill="none" />
        <Path
          d="M7 52 C5 46 6 40 9 40 C10 36 13 36 14 39 C15 35 18 35 19 39 C21 38 23 40 22 44 C25 44 25 48 21 52 C18 56 10 57 7 52 Z"
          fill={colors.surface}
          stroke={OUTLINE}
          strokeWidth={STROKE}
          strokeLinejoin="round"
        />
      </G>
      {/* Main sur la hanche */}
      <Path d="M90 92 Q104 96 98 112 Q94 116 90 112" fill={colors.surface} stroke={OUTLINE} strokeWidth={STROKE} />
    </>
  );
}

/** Jambes (cachées derrière la barre du bas, utiles ailleurs). */
function Legs() {
  return (
    <>
      <Rect x={40} y={140} width={11} height={14} rx={5} fill={colors.surface} stroke={OUTLINE} strokeWidth={STROKE} />
      <Rect x={68} y={140} width={11} height={14} rx={5} fill={colors.surface} stroke={OUTLINE} strokeWidth={STROKE} />
    </>
  );
}

/** Le frigo à deux portes, avec la feuille du logo sur la tête. */
function FridgeBody({ face }: { face: MascotFace }) {
  return (
    <>
      {/* Feuille sur la tête */}
      <Path
        d="M60 26 C52 22 46 14 50 8 C54 10 55 4 60 4 C64 2 68 8 72 6 C76 10 74 16 78 18 C74 24 66 26 60 26 Z"
        fill={colors.success}
        stroke={OUTLINE}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <Path d="M60 25 Q63 15 70 9" stroke={colors.successSoft} strokeWidth={1.6} strokeLinecap="round" fill="none" />
      <Legs />
      {/* Flanc (relief) */}
      <Rect x={34} y={26} width={64} height={118} rx={13} fill={colors.infoSoft} stroke={OUTLINE} strokeWidth={STROKE} />
      {/* Façade */}
      <Rect x={26} y={24} width={64} height={120} rx={13} fill={colors.surface} stroke={OUTLINE} strokeWidth={STROKE} />
      {/* Reflet */}
      <Path d="M32 40 Q32 30 40 29" stroke={colors.infoSoft} strokeWidth={3} strokeLinecap="round" fill="none" />
      {/* Séparation des portes */}
      <Path d="M27 88 H89" stroke={OUTLINE} strokeWidth={STROKE} />
      {/* Poignées */}
      <Rect x={34} y={77} width={22} height={6} rx={3} fill={colors.infoSoft} stroke={OUTLINE} strokeWidth={2} />
      <Rect x={34} y={98} width={22} height={6} rx={3} fill={colors.infoSoft} stroke={OUTLINE} strokeWidth={2} />
      {/* Afficheur de température */}
      <Rect x={64} y={76} width={20} height={8} rx={2} fill={colors.text} />
      {/* Visage légèrement décalé : la tête est tournée, le regard part vers la droite. */}
      <G transform="translate(-5 0)">
        <Face face={face} />
      </G>
      <Arms />
    </>
  );
}

/** Un bocal de confiture maison : couvercle à carreaux, verre bleuté, confiture et étiquette. */
function JarBody({ face }: { face: MascotFace }) {
  return (
    <>
      <Legs />
      {/* Verre (relief) */}
      <Rect x={32} y={30} width={64} height={114} rx={20} fill={colors.infoSoft} stroke={OUTLINE} strokeWidth={STROKE} />
      {/* Verre (face) */}
      <Rect x={24} y={30} width={68} height={114} rx={20} fill={colors.surface} stroke={OUTLINE} strokeWidth={STROKE} />
      {/* Confiture, vue à travers le verre */}
      <Path d="M27 96 Q58 88 89 96 V124 Q89 141 72 141 H44 Q27 141 27 124 Z" fill={colors.chartDiscarded} />
      <Path d="M33 101 Q45 97 55 99" stroke={colors.warningSoft} strokeWidth={2} strokeLinecap="round" fill="none" />
      {/* Étiquette */}
      <Rect x={36} y={106} width={44} height={22} rx={4} fill={colors.surface} stroke={OUTLINE} strokeWidth={2} />
      <Path d="M43 114 H73 M47 120 H69" stroke={colors.textSubtle} strokeWidth={2} strokeLinecap="round" />
      {/* Reflet du verre */}
      <Path d="M30 52 Q30 38 40 36" stroke={colors.infoSoft} strokeWidth={3} strokeLinecap="round" fill="none" />
      {/* Col et couvercle à carreaux */}
      <Rect x={30} y={22} width={56} height={10} rx={3} fill={colors.infoSoft} stroke={OUTLINE} strokeWidth={STROKE} />
      <Rect x={22} y={8} width={72} height={16} rx={5} fill={colors.danger} stroke={OUTLINE} strokeWidth={STROKE} />
      <Path d="M34 9 V23 M46 9 V23 M58 9 V23 M70 9 V23 M82 9 V23 M23 16 H93" stroke={colors.dangerSoft} strokeWidth={2.4} />
      <G transform="translate(-5 0)">
        <Face face={face} />
      </G>
      <Arms />
    </>
  );
}

/** Une brique de lait : toit à pignon, bouchon orange, bandeau bleu à vague. */
function CartonBody({ face }: { face: MascotFace }) {
  return (
    <>
      <Legs />
      {/* Côté (relief) */}
      <Path
        d="M90 40 L100 34 V138 L90 144 Z"
        fill={colors.infoSoft}
        stroke={OUTLINE}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <Path d="M90 40 L74 14 L84 10 L100 34 Z" fill={colors.info} stroke={OUTLINE} strokeWidth={STROKE} strokeLinejoin="round" />
      {/* Face */}
      <Rect x={26} y={38} width={64} height={106} rx={6} fill={colors.surface} stroke={OUTLINE} strokeWidth={STROKE} />
      {/* Toit à pignon et pli du haut */}
      <Path d="M26 40 L50 14 H74 L90 40 Z" fill={colors.infoSoft} stroke={OUTLINE} strokeWidth={STROKE} strokeLinejoin="round" />
      <Rect x={48} y={6} width={28} height={9} rx={2} fill={colors.surface} stroke={OUTLINE} strokeWidth={STROKE} />
      {/* Bouchon */}
      <Rect x={66} y={22} width={12} height={9} rx={3} fill={colors.chartDiscarded} stroke={OUTLINE} strokeWidth={2} />
      {/* Bandeau bleu à vague */}
      <Path d="M27 112 Q42 104 58 112 T89 112 V138 Q89 143 84 143 H32 Q27 143 27 138 Z" fill={colors.info} />
      <Path d="M27 112 Q42 104 58 112 T89 112" stroke={OUTLINE} strokeWidth={2} fill="none" />
      <Path d="M36 126 H58" stroke={colors.surface} strokeWidth={3} strokeLinecap="round" />
      {/* Reflet */}
      <Path d="M32 56 Q32 46 39 44" stroke={colors.infoSoft} strokeWidth={3} strokeLinecap="round" fill="none" />
      {/* Visage sous le toit */}
      <G transform="translate(-5 18)">
        <Face face={face} />
      </G>
      <Arms />
    </>
  );
}

/**
 * Mascotte SmartFridge (le frigo par défaut, ou un autre personnage choisi dans les Réglages). Tous
 * partagent le même gabarit, le même visage et les mêmes bras : expressions et animations communes.
 */
export function FridgeMascot({ size = 120, face = 'normal', kind = 'fridge' }: FridgeMascotProps) {
  return (
    <Svg width={size} height={(size * VIEW_H) / VIEW_W} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
      {/* Dessin retourné : la mascotte se tourne vers la droite, vers sa bulle et la liste. */}
      <G transform={`translate(${VIEW_W} 0) scale(-1 1)`}>
        {kind === 'jar' ? <JarBody face={face} /> : kind === 'carton' ? <CartonBody face={face} /> : <FridgeBody face={face} />}
      </G>
      {/* Hors du miroir, pour rester lisible. */}
      {kind === 'fridge' ? (
        <SvgText x={VIEW_W - 74} y={82} fontSize={5.5} fontWeight="700" fill={colors.infoSoft} textAnchor="middle">
          3°
        </SvgText>
      ) : null}
    </Svg>
  );
}

const PEEK_SIZE = 100;
/** Partie visible au-dessus de la barre du bas : la feuille, la tête et la main qui salue. */
const PEEK_VISIBLE = (PEEK_SIZE * 68) / VIEW_W;
/** Hauteur dont elle sort de la barre pour parler : on voit sa tête, ses bras et le haut des portes. */
const RISE = 52;
/** Marge au-dessus de la tête pour que les sauts ne soient pas coupés. */
const HEADROOM = 34;
/** Durée d’affichage d’une réaction avant le retour à l’expression neutre. */
const REACTION_MS = 1800;
/** Bulle : à droite de la tête, pointe sur le côté de la tête, bulle au-dessus du bouton « Ajouter ». */
const BUBBLE_LEFT = 91;
const BUBBLE_BOTTOM = 86;
/** Une bulle de BD reste courte : sur iPad, elle ne s’étire pas sur toute la largeur. */
const BUBBLE_MAX_WIDTH = 340;
/** Délai avant le bonjour : le temps que l’écran s’installe et que la mascotte sorte. */
const GREETING_DELAY_MS = 1100;
/** Profondeur (pt) à laquelle la mascotte s’enfonce derrière la barre d’onglets. */
const TAB_BAR_TUCK = 10;

const quad = { duration: 1100, easing: Easing.inOut(Easing.quad) };
const bounce = { damping: 9, stiffness: 220 };

/** Jour du dernier bonjour, pour toute la session de l’app : une fois par jour suffit. */
let lastGreetingDay: string | null = null;

interface PeekingFridgeMascotProps {
  /** Ce que la mascotte peut dire du frigo affiché. */
  fridge: FridgeSnapshot;
  /** Les produits sont chargés : sans cela, elle dirait « votre frigo est vide » à tort. */
  ready: boolean;
  /** La liste a défilé : la mascotte se cache pour ne couvrir aucun produit. */
  scrolled?: boolean;
  /** Une ligne est ouverte par un balayage : son panneau « Consommé » ne doit pas être caché. */
  rowOpen?: boolean;
  /** Tablette en deux colonnes : la mascotte se cale sous la colonne de gauche (résumé). */
  wide?: boolean;
}

/**
 * La mascotte attend derrière la barre d’onglets, la tête dépassant, comme les Bitmoji au-dessus
 * du clavier de Snapchat. Pour parler, elle sort de la barre et une bulle de BD s’ouvre :
 * bonjour une fois par jour avec l’état du frigo, une réaction quand un produit est consommé ou
 * jeté, avec « Annuler » (elle remplace alors le message du bas), une réplique quand on la touche.
 * Le dessin est décoratif ; la bulle est lue par le lecteur d’écran.
 */
export function PeekingFridgeMascot({
  fridge,
  ready,
  scrolled = false,
  rowOpen = false,
  wide = false,
}: PeekingFridgeMascotProps) {
  // Personnage choisi dans les Réglages (le frigo par défaut).
  const mascotKind = useSettings().settings.mascot;
  const reduceMotion = useReducedMotion();
  const focused = useIsFocused();
  // Sur iPad, la mascotte se cale sur la colonne de contenu, pas sur le bord de l’écran.
  const layout = useLayout();
  const { width } = layout;
  const gutter = wide ? layout.wideGutter : layout.gutter;
  const bubbleLeft = gutter - spacing.lg + BUBBLE_LEFT;
  // Elle sort du haut de la barre d’onglets flottante ; son bas, coupé net, reste caché derrière le verre.
  const tabBarTop = useGlassTabBarTop() - TAB_BAR_TUCK;
  const [face, setFace] = useState<MascotFace>('normal');
  const [speech, setSpeechState] = useState<{ line: Line; action?: BubbleAction } | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Hors de l’écran, la bulle est fermée : elle n’attend pas l’utilisateur à son retour.
  const spoken = focused ? speech : null;
  const focusedRef = useRef(focused);
  useEffect(() => {
    focusedRef.current = focused;
  }, [focused]);
  const tapCount = useRef(0);
  const tapTimes = useRef<number[]>([]);
  const { tucked, breathing } = mascotPose({
    focused,
    scrolled,
    rowOpen,
    reacting: face !== 'normal' || spoken !== null,
    reduceMotion,
  });

  // Cachée au départ : elle sort de derrière la barre à la première apparition.
  const tuck = useSharedValue(reduceMotion ? 0 : PEEK_VISIBLE);
  const rise = useSharedValue(0);
  const bob = useSharedValue(0);
  const lift = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const tilt = useSharedValue(0);
  const scale = useSharedValue(1);
  const firstShow = useRef(true);

  useEffect(() => {
    const target = tucked ? PEEK_VISIBLE : 0;
    if (reduceMotion) {
      tuck.set(target);
      return;
    }
    const spring = withSpring(target, { damping: 14, stiffness: 160 });
    tuck.set(firstShow.current && !tucked ? withDelay(500, spring) : spring);
    if (!tucked) firstShow.current = false;
  }, [tucked, reduceMotion, tuck]);

  // Elle sort de la barre pendant qu’elle parle, et y retourne ensuite.
  useEffect(() => {
    const target = spoken ? -RISE : 0;
    rise.set(reduceMotion ? target : withSpring(target, { duration: 420, dampingRatio: spoken ? 0.68 : 1 }));
  }, [spoken, reduceMotion, rise]);

  // Respiration seulement quand on la voit : rien ne tourne hors de l’écran ni quand elle est cachée.
  useEffect(() => {
    if (!breathing) {
      cancelAnimation(bob);
      bob.set(reduceMotion ? 0 : withTiming(0, { duration: 200 }));
      return;
    }
    bob.set(withRepeat(withSequence(withTiming(5, quad), withTiming(0, quad)), -1));
    return () => cancelAnimation(bob);
  }, [breathing, reduceMotion, bob]);

  const say = useCallback((line: Line, action?: BubbleAction) => {
    setSpeechState({ line, action });
    clearTimeout(speechTimer.current);
    // Avec « Annuler », la bulle reste au moins 6 s, comme l’ancien message en bas de l’écran.
    const duration = action ? Math.max(UNDO_WINDOW_MS, readingTimeMs(line.text)) : readingTimeMs(line.text);
    speechTimer.current = setTimeout(() => setSpeechState(null), duration);
  }, []);

  const hush = useCallback(() => {
    clearTimeout(speechTimer.current);
    setSpeechState(null);
  }, []);

  const react = useCallback(
    (mood: MascotMood) => {
      setFace(mood);
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setFace('normal'), REACTION_MS);
      if (reduceMotion) return;
      const fast = (to: number, ms = 70) => withTiming(to, { duration: ms });
      if (mood === 'happy') {
        // Deux petits sauts de joie en se dandinant.
        lift.set(withSequence(withSpring(-22, bounce), withSpring(0, bounce), withSpring(-14, bounce), withSpring(0, bounce)));
        tilt.set(withSequence(fast(-8, 160), fast(8, 220), fast(-6, 220), fast(0, 180)));
      } else if (mood === 'angry') {
        // Se redresse, gonfle et trépigne.
        lift.set(withSequence(withSpring(-8, bounce), withDelay(900, withSpring(0, bounce))));
        scale.set(withSequence(fast(1.08, 120), withDelay(900, fast(1, 200))));
        shakeX.set(withSequence(...[-5, 5, -5, 5, -4, 4, -3, 3, 0].map((x) => fast(x, 55))));
      } else {
        // Sursaut : bondit et vibre (elle ne se cache plus : elle va parler).
        lift.set(withSequence(fast(-16, 90), withSpring(0, { duration: 380, dampingRatio: 0.6 })));
        scale.set(withSequence(fast(1.1, 90), fast(1, 200)));
        shakeX.set(withSequence(...[-3, 3, -3, 3, -2, 2, 0].map((x) => fast(x, 40))));
      }
    },
    [reduceMotion, lift, tilt, scale, shakeX],
  );

  // Produit consommé ou jeté (accueil ou fiche produit) : l’expression change toujours, la bulle
  // seulement de temps en temps.
  useEffect(
    () =>
      subscribeMascotMood((mood, product) => {
        // Pas à l’écran : l’appelant garde son message habituel (avec « Annuler »).
        if (!focusedRef.current) return false;
        react(mood);
        if (mood === 'shocked') return true;
        const line = reactionLine(mood, product);
        const undo = product?.undo;
        const action = undo
          ? {
              label: 'Annuler',
              onPress: () => {
                haptics.select();
                undo();
                say(undoLine(product));
              },
            }
          : undefined;
        say(line, action);
        // Le lecteur d’écran annonçait le message du bas : la bulle prend le relais.
        AccessibilityInfo.announceForAccessibility(line.text);
        return true;
      }),
    [react, say],
  );

  // Bonjour une fois par jour, sur l’écran affiché, liste en haut, produits chargés.
  const fridgeRef = useRef(fridge);
  useEffect(() => {
    fridgeRef.current = fridge;
  }, [fridge]);
  useEffect(() => {
    if (!focused || !ready || scrolled || !shouldGreet(lastGreetingDay, new Date())) return;
    const timer = setTimeout(() => {
      const now = new Date();
      lastGreetingDay = toLocalDateString(now);
      say(greetingLine(fridgeRef.current, now));
    }, GREETING_DELAY_MS);
    return () => clearTimeout(timer);
  }, [focused, ready, scrolled, say]);

  useEffect(
    () => () => {
      clearTimeout(resetTimer.current);
      clearTimeout(speechTimer.current);
    },
    [],
  );

  // Toucher : sursaut et réplique ; pendant qu’elle parle, la réplique suivante.
  const onPress = useCallback(() => {
    haptics.light();
    const now = Date.now();
    tapTimes.current = [...tapTimes.current.slice(-3), now];
    if (isTappingTooFast(tapTimes.current)) {
      tapTimes.current = [];
      react('angry');
      say(TEASE_LINE);
      return;
    }
    if (!spoken) react('shocked');
    say(tapLine(tapCount.current, fridge, new Date(now)));
    tapCount.current += 1;
  }, [react, say, spoken, fridge]);

  // Un toast s’affiche au-dessus de la barre : la mascotte et sa bulle montent au-dessus de lui.
  const toastVisible = useToastVisible();
  const aboveToast = useSharedValue(0);
  useEffect(() => {
    aboveToast.set(
      withTiming(toastVisible ? TOAST_CLEARANCE - spacing.lg : 0, { duration: 240, easing: Easing.out(Easing.cubic) }),
    );
  }, [toastVisible, aboveToast]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: tuck.get() + rise.get() + bob.get() + lift.get() },
      { translateX: shakeX.get() },
      { rotate: `${tilt.get()}deg` },
      { scale: scale.get() },
    ],
  }));
  const containerStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -aboveToast.get() }] }));

  return (
    <Animated.View pointerEvents="box-none" style={[styles.stage, { bottom: tabBarTop }, containerStyle]}>
      {/* La barre du bas cache ce qui dépasse en dessous : c’est ce qui la fait « sortir » de la barre. */}
      {/* Le dessin est décoratif ; la bulle, elle, est lue par le lecteur d’écran. */}
      <View
        style={[styles.clip, { left: gutter }]}
        pointerEvents="box-none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Animated.View style={[styles.mascot, style]} pointerEvents={tucked ? 'none' : 'auto'}>
          <Pressable onPress={onPress} accessible={false}>
            <FridgeMascot size={PEEK_SIZE} face={spoken ? spoken.line.face : face} kind={mascotKind} />
          </Pressable>
        </Animated.View>
      </View>
      <View style={[styles.bubble, { left: bubbleLeft }]} pointerEvents="box-none">
        <SpeechBubble
          text={spoken?.line.text ?? null}
          action={spoken?.action}
          maxWidth={Math.min(BUBBLE_MAX_WIDTH, width - bubbleLeft - gutter)}
          onPress={hush}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stage: { position: 'absolute', left: 0, right: 0, height: BUBBLE_BOTTOM + 160 },
  clip: {
    position: 'absolute',
    bottom: 0,
    width: PEEK_SIZE,
    height: HEADROOM + RISE + PEEK_VISIBLE,
    overflow: 'hidden',
  },
  mascot: { marginTop: HEADROOM + RISE },
  bubble: { position: 'absolute', bottom: BUBBLE_BOTTOM },
});
