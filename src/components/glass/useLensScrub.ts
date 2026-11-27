import { useMemo } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { useReducedMotion, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { glassSpring, lensIndexAt } from '@/theme/liquidGlass';
import { haptics } from '@/utils/haptics';

interface LensScrubOptions {
  /** Nombre de choix (onglets, segments). */
  count: number;
  /** Largeur d’un choix et marge avant le premier (pt), dans le repère du conteneur. */
  itemWidth: number;
  inset?: number;
  /** Position de la pastille (en index, décimale pendant le geste). */
  position: SharedValue<number>;
  /** 0 → 1 pendant que le doigt tient la pastille : elle « se soulève » (plus grande, plus brillante). */
  lift: SharedValue<number>;
  /** Choix sous le doigt au relâchement. */
  onSelect: (index: number) => void;
}

/**
 * Geste des barres Liquid Glass d’iOS 26 (Apple Music, Photos…) : on pose le doigt sur la barre et on
 * glisse ; la pastille de verre suit le doigt en se soulevant, un déclic marque chaque choix survolé,
 * et le relâchement choisit l’élément sous le doigt. Un simple toucher reste géré par les boutons
 * (le geste ne démarre qu’après un vrai glissement horizontal).
 */
export function useLensScrub({ count, itemWidth, inset = 0, position, lift, onSelect }: LensScrubOptions) {
  const hovered = useSharedValue(-1);
  const reducedMotion = useReducedMotion();

  return useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-8, 8])
        .failOffsetY([-16, 16])
        .onStart(() => {
          lift.set(reducedMotion ? 1 : withSpring(1, glassSpring.press));
          hovered.set(Math.round(position.get()));
        })
        .onUpdate((event) => {
          const { continuous, index } = lensIndexAt(event.x, itemWidth, inset, count);
          position.set(continuous);
          if (index !== hovered.get()) {
            hovered.set(index);
            scheduleOnRN(haptics.select);
          }
        })
        .onEnd(() => {
          const index = Math.round(position.get());
          position.set(reducedMotion ? index : withSpring(index, glassSpring.morph));
          scheduleOnRN(onSelect, index);
        })
        .onFinalize(() => {
          lift.set(reducedMotion ? 0 : withSpring(0, glassSpring.release));
          hovered.set(-1);
        }),
    [count, itemWidth, inset, position, lift, onSelect, hovered, reducedMotion],
  );
}
