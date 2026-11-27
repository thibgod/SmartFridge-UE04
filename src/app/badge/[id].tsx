import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { EmptyState } from '@/components/EmptyState';
import { Medal, MedalEdge } from '@/components/badges/Medal';
import { Button } from '@/components/ui/Button';
import { computeAchievements } from '@/features/achievements/achievements';
import {
  flipAngle,
  medalOf,
  restingAngle,
  seenAfterOpening,
  TIER_LABEL,
  type MedalShape,
  type MedalTier,
} from '@/features/achievements/medals';
import { useProducts } from '@/features/products/ProductsProvider';
import { useRecipeLog } from '@/features/recipes/RecipeLogProvider';
import { useSettings } from '@/features/settings/SettingsProvider';
import { fontSize, HEADING_FONT_SCALE, makeStyles, radius, spacing } from '@/theme';
import { haptics } from '@/utils/haptics';
import { goBack } from '@/utils/navigation';

const MEDAL_SIZE = 230;
/** Épaisseur de la médaille (pt) et nombre de tranches empilées pour la dessiner de profil. */
const MEDAL_THICKNESS = 18;
const EDGE_SLICES = 12;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** Fiche d'une médaille : on la fait tourner au doigt, et elle arrive en tournant quand elle vient d'être gagnée. */
export default function BadgeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products } = useProducts();
  const { history } = useRecipeLog();
  const { settings, updateSettings } = useSettings();
  const styles = useStyles();
  const reduced = useReducedMotion();

  const threshold = settings.urgentThresholdDays;
  const badge = useMemo(
    () => computeAchievements(products, history, new Date(), threshold).badges.find((b) => b.id === id),
    [products, history, id, threshold],
  );
  // Décidé une fois à l'ouverture : la fête ne rejoue pas quand le badge passe en « vu ».
  const [celebrate] = useState(
    () => badge?.achieved === true && settings.seenBadges !== null && !settings.seenBadges.includes(badge.id),
  );

  // Rotation en degrés autour de l'axe vertical ; 0 = face visible.
  const rotation = useSharedValue(celebrate && !reduced ? -720 : 0);
  const scale = useSharedValue(celebrate && !reduced ? 0.6 : 1);
  const start = useSharedValue(0);

  useEffect(() => {
    if (!badge?.achieved) return;
    if (settings.seenBadges && !settings.seenBadges.includes(badge.id)) {
      void updateSettings({ seenBadges: seenAfterOpening(settings.seenBadges, badge.id) }).catch(() => undefined);
    }
  }, [badge, settings.seenBadges, updateSettings]);

  useEffect(() => {
    if (!celebrate) return;
    if (reduced) {
      haptics.success();
      return;
    }
    // La médaille arrive en tournant et ralentit jusqu'à se poser face visible : le déclic tombe à cet instant.
    scale.set(withTiming(1, { duration: 900, easing: EASE_OUT }));
    rotation.set(
      withTiming(0, { duration: 1600, easing: EASE_OUT }, (finished) => {
        if (finished) scheduleOnRN(haptics.success);
      }),
    );
  }, [celebrate, reduced, rotation, scale]);

  // Le reflet suit l'angle : la lumière glisse sur le métal quand on tourne la médaille.
  const sheen = useDerivedValue(() => {
    const turn = ((rotation.get() % 360) + 360) % 360;
    return turn < 180 ? turn / 180 : (360 - turn) / 180;
  });

  const spin = Gesture.Pan()
    .enabled(badge?.achieved === true)
    .activeOffsetX([-8, 8])
    .onBegin(() => {
      start.set(rotation.get());
    })
    .onUpdate((e) => {
      rotation.set(start.get() + e.translationX * 0.7);
    })
    .onEnd((e) => {
      // Un lancer garde un peu d’élan (un tour de plus au maximum), puis la médaille se pose sur la face
      // la plus proche : on peut la laisser sur le revers pour le lire. Pas de rebond : elle se pose.
      rotation.set(
        withSpring(restingAngle(rotation.get(), e.velocityX), { duration: 750, dampingRatio: 1, velocity: e.velocityX * 0.7 }),
      );
    });

  // Un toucher retourne la médaille d’un demi-tour : voir le revers sans avoir à la lancer.
  const flip = Gesture.Tap()
    .enabled(badge?.achieved === true)
    .onEnd(() => {
      rotation.set(withSpring(flipAngle(rotation.get()), { duration: 600, dampingRatio: 0.85 }));
      scheduleOnRN(haptics.select);
    });
  const gesture = Gesture.Race(spin, flip);

  // Lecteur d’écran : la même chose qu’un toucher.
  const flipForAccessibility = () => {
    rotation.set(
      reduced ? flipAngle(rotation.get()) : withSpring(flipAngle(rotation.get()), { duration: 600, dampingRatio: 0.85 }),
    );
  };

  // Face posée sur le dessus de l’épaisseur, revers en dessous : de profil, on voit la tranche entre les deux.
  // Un point à la profondeur d se projette à d × sin(angle) : chaque couche se décale d’autant.
  const front = useAnimatedStyle(() => {
    const shift = (MEDAL_THICKNESS / 2) * Math.sin((rotation.get() * Math.PI) / 180);
    return {
      transform: [{ perspective: 900 }, { translateX: shift }, { rotateY: `${rotation.get()}deg` }, { scale: scale.get() }],
    };
  });
  const backFace = useAnimatedStyle(() => {
    const shift = -(MEDAL_THICKNESS / 2) * Math.sin((rotation.get() * Math.PI) / 180);
    return {
      transform: [{ perspective: 900 }, { translateX: shift }, { rotateY: `${rotation.get() + 180}deg` }, { scale: scale.get() }],
    };
  });

  if (!badge) {
    return (
      <EmptyState
        icon="help-circle-outline"
        title="Badge introuvable"
        message=""
        action={<Button label="Fermer" onPress={goBack} />}
      />
    );
  }

  const medal = medalOf(badge);
  const ratio = badge.current / badge.target;

  return (
    <View style={styles.content}>
      <GestureDetector gesture={gesture}>
        <View
          style={styles.stage}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`${badge.title}, ${badge.achieved ? TIER_LABEL[medal.tier] : 'médaille pas encore obtenue'}`}
          accessibilityActions={badge.achieved ? [{ name: 'activate', label: 'Retourner la médaille' }] : undefined}
          onAccessibilityAction={flipForAccessibility}
        >
          {badge.achieved
            ? Array.from({ length: EDGE_SLICES }, (_, i) => (
                <EdgeSlice
                  key={i}
                  depth={MEDAL_THICKNESS * (i / (EDGE_SLICES - 1) - 0.5)}
                  rotation={rotation}
                  scale={scale}
                  tier={medal.tier}
                  shape={medal.shape}
                />
              ))
            : null}
          {badge.achieved ? (
            <Animated.View style={[styles.face, styles.back, backFace]} pointerEvents="none">
              <Medal {...medal} icon={badge.icon} achieved size={MEDAL_SIZE} back />
              <View style={styles.engraving}>
                <Text style={[styles.engraveSmall, styles.engraved]}>SmartFridge</Text>
                <Text style={[styles.engraveTitle, styles.engraved]} numberOfLines={2}>
                  {badge.title}
                </Text>
                <Text style={[styles.engraveSmall, styles.engraved]}>{TIER_LABEL[medal.tier]}</Text>
              </View>
            </Animated.View>
          ) : null}
          <Animated.View style={[styles.face, front]}>
            <Medal
              {...medal}
              icon={badge.icon}
              achieved={badge.achieved}
              size={MEDAL_SIZE}
              progress={ratio}
              sheen={badge.achieved ? sheen : undefined}
            />
          </Animated.View>
        </View>
      </GestureDetector>

      <Text style={styles.tier}>{badge.achieved ? TIER_LABEL[medal.tier] : 'Pas encore obtenue'}</Text>
      <Text style={styles.title} maxFontSizeMultiplier={HEADING_FONT_SCALE} accessibilityRole="header">
        {badge.title}
      </Text>
      <Text style={styles.description}>{badge.description}</Text>

      {badge.achieved ? (
        <Text style={styles.hint}>Faites-la tourner du bout du doigt, ou touchez-la pour voir le revers.</Text>
      ) : (
        <View style={styles.progressBlock}>
          <View
            style={styles.bar}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: badge.target, now: Math.floor(badge.current) }}
          >
            <View style={[styles.barFill, { width: `${Math.max(3, ratio * 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {Math.floor(badge.current)} / {badge.target}
          </Text>
        </View>
      )}

      <Button label="Fermer" variant="secondary" onPress={goBack} style={styles.close} />
    </View>
  );
}

/** Une tranche de la médaille, à la profondeur `depth` (pt) : elle suit la rotation comme la face. */
function EdgeSlice({
  depth,
  rotation,
  scale,
  tier,
  shape,
}: {
  depth: number;
  rotation: SharedValue<number>;
  scale: SharedValue<number>;
  tier: MedalTier;
  shape: MedalShape;
}) {
  const styles = useStyles();
  const style = useAnimatedStyle(() => {
    const shift = depth * Math.sin((rotation.get() * Math.PI) / 180);
    return {
      transform: [{ perspective: 900 }, { translateX: shift }, { rotateY: `${rotation.get()}deg` }, { scale: scale.get() }],
    };
  });
  return (
    <Animated.View style={[styles.slice, style]} pointerEvents="none">
      <MedalEdge tier={tier} shape={shape} size={MEDAL_SIZE} />
    </Animated.View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  stage: {
    width: MEDAL_SIZE + 40,
    height: MEDAL_SIZE + 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  face: { position: 'absolute', backfaceVisibility: 'hidden' },
  slice: { position: 'absolute' },
  back: {},
  engraving: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 44,
    gap: 4,
    opacity: 0.6,
  },
  engraveSmall: {
    fontSize: fontSize.micro + 1,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  engraveTitle: { fontSize: fontSize.bodyLarge, fontWeight: '800', textAlign: 'center' },
  // Gravure : encre sombre et liseré clair dessous, lisible sur tous les métaux, en clair comme en sombre.
  engraved: {
    color: 'rgba(43, 28, 16, 0.78)',
    textShadowColor: 'rgba(255, 255, 255, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  tier: { fontSize: fontSize.caption, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', color: colors.primary },
  title: { fontSize: fontSize.title, fontWeight: '800', color: colors.text, textAlign: 'center' },
  description: { fontSize: fontSize.body, color: colors.textMuted, textAlign: 'center' },
  hint: { marginTop: spacing.md, fontSize: fontSize.caption, color: colors.textSubtle },
  progressBlock: { alignSelf: 'stretch', marginTop: spacing.md, gap: spacing.xs, alignItems: 'center' },
  bar: { alignSelf: 'stretch', height: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: radius.pill, backgroundColor: colors.primary },
  progressText: { fontSize: fontSize.caption, fontWeight: '700', color: colors.textMuted, fontVariant: ['tabular-nums'] },
  close: { alignSelf: 'stretch', marginTop: spacing.xl },
}));
