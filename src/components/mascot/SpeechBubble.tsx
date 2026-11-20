import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { CHROME_FONT_SCALE, fontSize } from '@/theme';
import { lightPalette } from '@/theme/tokens';

/**
 * Bulle de bande dessinée (phylactère) de la mascotte : contour encré, ombre décalée en aplat comme
 * dans les albums, pointe incurvée vers la mascotte. Mêmes couleurs fixes que la mascotte : elle fait
 * partie du dessin, identique en mode sombre.
 */

const INK = lightPalette.text;
const PAPER = '#FFFDF7';
/** Fond de l’étiquette « Annuler » : le vert pâle de la feuille de la mascotte. */
const ACCENT_SOFT = lightPalette.successSoft;
const BORDER = 2.5;
const RADIUS = 18;
/** Ombre « imprimée » : un aplat d’encre décalé, sans flou (rien à recalculer à l’animation). */
const SHADOW = 3;

/** Pointe : sa base recouvre le bas de la bulle, sa pointe vise la bouche de la mascotte (en bas à gauche). */
const TAIL_W = 26;
const TAIL_H = 24;
const TAIL_LEFT = 12;
const TAIL_OVERLAP = 4;
const TAIL_FILL = 'M6 0 H22 V4 Q15 15 1 23 Q9 13 7 4 Z';
const TAIL_STROKE = 'M22 4 Q15 15 1 23 Q9 13 7 4';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export interface BubbleAction {
  label: string;
  onPress: () => void;
}

interface SpeechBubbleProps {
  /** Texte affiché ; `null` referme la bulle (avec son animation de sortie). */
  text: string | null;
  /** Bouton dans la bulle (« Annuler » après un produit consommé ou jeté). */
  action?: BubbleAction;
  maxWidth: number;
  onPress: () => void;
}

export function SpeechBubble({ text, action, maxWidth, onPress }: SpeechBubbleProps) {
  const reduceMotion = useReducedMotion();
  // Le texte reste affiché pendant la sortie : on ne démonte qu’une fois la bulle refermée.
  const [shown, setShown] = useState(text);
  if (text && text !== shown) setShown(text);
  // Le bouton suit le texte : pendant la sortie, il reste affiché mais ne répond plus.
  const [shownAction, setShownAction] = useState(action);
  if (text && action !== shownAction) setShownAction(action);
  const appear = useSharedValue(0);

  // Ouvrir, changer de réplique ou refermer.
  useEffect(() => {
    if (text) {
      appear.set(
        reduceMotion ? withTiming(1, { duration: 150 }) : withSpring(1, { duration: 380, dampingRatio: 0.62 }), // petit rebond : c’est un personnage qui parle
      );
      return;
    }
    appear.set(
      withTiming(0, { duration: reduceMotion ? 120 : 160, easing: EASE_OUT }, (finished) => {
        if (finished) scheduleOnRN(setShown, null);
      }),
    );
  }, [text, reduceMotion, appear]);

  // Nouvelle réplique pendant que la bulle est ouverte : léger « pop » pour signaler le changement.
  const pop = useSharedValue(1);
  useEffect(() => {
    if (!text || reduceMotion) return;
    pop.set(0.94);
    pop.set(withSpring(1, { duration: 300, dampingRatio: 0.6 }));
  }, [text, reduceMotion, pop]);

  const style = useAnimatedStyle(() => {
    const t = appear.get();
    if (reduceMotion) return { opacity: t };
    return {
      opacity: Math.min(1, t * 1.6),
      transform: [{ translateY: (1 - t) * 8 }, { scale: (0.86 + 0.14 * t) * pop.get() }],
    };
  });

  if (!shown) return null;

  return (
    <Animated.View style={[styles.anchor, { maxWidth }, style]} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        accessibilityRole="text"
        accessibilityLabel={shown}
        accessibilityHint="Touchez pour fermer la bulle"
        hitSlop={8}
        style={styles.press}
      >
        {/* Ombre décalée : aplat d’encre derrière la bulle et sa pointe. */}
        <View style={[styles.body, styles.shadow]} />
        <Svg width={TAIL_W} height={TAIL_H} style={[styles.tail, styles.tailShadow]}>
          <Path d={TAIL_FILL} fill={INK} />
        </Svg>

        <View style={styles.body}>
          <Text style={styles.text} maxFontSizeMultiplier={CHROME_FONT_SCALE} numberOfLines={4}>
            {shown}
          </Text>
          {shownAction ? (
            <Pressable
              onPress={text ? shownAction.onPress : undefined}
              accessibilityRole="button"
              accessibilityLabel={shownAction.label}
              hitSlop={{ top: 10, bottom: 10, left: 12, right: 12 }}
              style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
            >
              <Ionicons name="arrow-undo" size={14} color={INK} />
              <Text style={styles.actionText} maxFontSizeMultiplier={CHROME_FONT_SCALE}>
                {shownAction.label}
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Pointe : son remplissage efface le contour du bas de la bulle à la jonction. */}
        <Svg width={TAIL_W} height={TAIL_H} style={styles.tail}>
          <Path d={TAIL_FILL} fill={PAPER} />
          <Path d={TAIL_STROKE} fill="none" stroke={INK} strokeWidth={BORDER} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // La bulle grandit depuis sa pointe, comme si la mascotte la soufflait.
  anchor: { transformOrigin: `${TAIL_LEFT}px 100%`, paddingRight: SHADOW, paddingBottom: TAIL_H - TAIL_OVERLAP },
  press: { alignSelf: 'flex-start' },
  body: {
    backgroundColor: PAPER,
    borderColor: INK,
    borderWidth: BORDER,
    borderRadius: RADIUS,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  shadow: {
    position: 'absolute',
    top: SHADOW,
    left: SHADOW,
    right: -SHADOW,
    bottom: -SHADOW,
    backgroundColor: INK,
  },
  text: { color: INK, fontSize: fontSize.body, lineHeight: 20, fontWeight: '700', letterSpacing: -0.1 },
  // « Annuler » : petite étiquette encrée, comme un cartouche de BD, alignée à droite sous le texte.
  action: {
    alignSelf: 'flex-end',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 7,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: INK,
    backgroundColor: ACCENT_SOFT,
  },
  actionPressed: { opacity: 0.6 },
  actionText: { color: INK, fontSize: fontSize.caption, fontWeight: '800' },
  tail: { position: 'absolute', left: TAIL_LEFT, bottom: -(TAIL_H - TAIL_OVERLAP) },
  tailShadow: { left: TAIL_LEFT + SHADOW, bottom: -(TAIL_H - TAIL_OVERLAP) - SHADOW },
});
