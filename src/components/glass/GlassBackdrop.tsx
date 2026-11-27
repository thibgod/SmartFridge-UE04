import { useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useGlass } from './useGlass';

/**
 * Style du fond d’ambiance : trois halos doux (accent en haut à gauche, froid à droite, chaud en bas) sur
 * la couleur de fond. Sans eux, le verre posé sur un aplat uni ne réfracte rien et paraît gris.
 * Sert aussi de fond par défaut aux feuilles de la pile de navigation (`contentStyle` dans `_layout.tsx`).
 * `warm: false` retire le halo chaud du bas : pour les feuilles ajustées à leur contenu, sous lesquelles iOS
 * ajoute une marge de couleur unie où le halo s’arrêterait net.
 */
export function useBackdropStyle({ warm = true }: { warm?: boolean } = {}): ViewStyle {
  const { glass } = useGlass();
  return useMemo(() => {
    const [base] = glass.backdrop;
    const [accent, cool, warmGlow] = glass.backdropGlow;
    const clear = 'rgba(0, 0, 0, 0)';
    return {
      backgroundColor: base,
      experimental_backgroundImage: [
        `radial-gradient(circle at 0% 0%, ${accent} 0%, ${clear} 60%)`,
        `radial-gradient(circle at 100% 40%, ${cool} 0%, ${clear} 55%)`,
        ...(warm ? [`radial-gradient(circle at 20% 100%, ${warmGlow} 0%, ${clear} 55%)`] : []),
      ].join(', '),
    };
  }, [glass, warm]);
}

/**
 * Fond d’ambiance posé en premier enfant d’un écran. Les onglets le partagent (un seul, derrière tous,
 * voir `(tabs)/_layout.tsx`) : il ne clignote pas quand on change d’onglet.
 */
export function GlassBackdrop() {
  const backdrop = useBackdropStyle();
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, backdrop]} />;
}
