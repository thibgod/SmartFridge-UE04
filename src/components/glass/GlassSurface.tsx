import { BlurView, type BlurTint } from 'expo-blur';
import { GlassView } from 'expo-glass-effect';
import { useEffect, type PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@/theme';
import { GLASS_FADE_MS, GLASS_MATERIALS, glassRadius, PROMINENT_VEIL, withAlpha, type GlassMaterial } from '@/theme/liquidGlass';

import { useGlass } from './useGlass';

export type GlassElevation = 'none' | 'low' | 'high';

export interface GlassSurfaceProps extends Omit<ViewProps, 'style'> {
  /** Épaisseur du verre (voir `GLASS_MATERIALS`). */
  material?: GlassMaterial;
  radius?: number;
  /** Verre teinté par la couleur d’accent (bouton principal). Le texte posé dessus utilise `onPrimary`. */
  prominent?: boolean;
  /** Couleur du verre proéminent (accent par défaut ; `colors.danger` pour une action destructive). */
  tint?: string;
  /** iOS 26 : le verre réagit lui-même au toucher (reflet, léger gonflement). */
  interactive?: boolean;
  /**
   * Faux : le verre s’efface (le contenu reste visible). Sert aux barres qui n’apparaissent qu’au
   * défilement. Ne jamais passer l’opacité d’un parent à 0 : le matériau iOS 26 ne se redessine plus.
   */
  active?: boolean;
  elevation?: GlassElevation;
  style?: StyleProp<ViewStyle>;
}

const BLUR_TINTS: Record<GlassMaterial, { light: BlurTint; dark: BlurTint }> = {
  clear: { light: 'systemUltraThinMaterialLight', dark: 'systemUltraThinMaterialDark' },
  regular: { light: 'systemThinMaterialLight', dark: 'systemThinMaterialDark' },
  thick: { light: 'systemChromeMaterialLight', dark: 'systemChromeMaterialDark' },
};

/**
 * Brique de base du verre. Tous les composants `Glass*` la réutilisent : elle choisit le rendu
 * (matériau iOS 26, flou, verre simulé Android, surface pleine) et dessine reflets et liseré lumineux.
 */
export function GlassSurface({
  material = 'regular',
  radius = glassRadius.card,
  prominent = false,
  tint,
  interactive = false,
  active = true,
  elevation = 'low',
  style,
  children,
  ...viewProps
}: PropsWithChildren<GlassSurfaceProps>) {
  const { mode, glass, isDark } = useGlass();
  const { colors } = useTheme();
  const reducedMotion = useReducedMotion();
  const spec = GLASS_MATERIALS[material];

  const shown = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    shown.set(reducedMotion ? (active ? 1 : 0) : withTiming(active ? 1 : 0, { duration: GLASS_FADE_MS }));
  }, [active, reducedMotion, shown]);
  const layersStyle = useAnimatedStyle(() => ({ opacity: shown.value }));

  if (mode === 'native') {
    return (
      <GlassView
        {...viewProps}
        glassEffectStyle={{ style: active ? spec.nativeStyle : 'none', animate: true, animationDuration: GLASS_FADE_MS / 1000 }}
        tintColor={prominent ? (tint ?? glass.prominentTint) : material === 'thick' ? glass.barTint : undefined}
        isInteractive={interactive}
        colorScheme={isDark ? 'dark' : 'light'}
        style={[{ borderRadius: radius }, style]}
      >
        {children}
      </GlassView>
    );
  }

  const scheme = isDark ? 'dark' : 'light';
  const shape = { borderRadius: radius };
  let veil: string;
  const prominentColor = tint ?? colors.primary;
  if (mode === 'opaque') veil = prominent ? prominentColor : colors.surfaceRaised;
  else if (prominent) veil = withAlpha(prominentColor, mode === 'blur' ? 0.78 : PROMINENT_VEIL);
  else veil = withAlpha(glass.veilBase, spec.veil[mode][scheme]);

  const shadow = elevation === 'none' ? undefined : elevation === 'high' ? glass.shadowStrong : glass.shadow;
  const showReflections = mode !== 'opaque';

  return (
    <View {...viewProps} style={[shape, style]}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, layersStyle]}>
        {shadow ? <View style={[StyleSheet.absoluteFill, shape, { boxShadow: shadow }]} /> : null}
        <View style={[StyleSheet.absoluteFill, shape, styles.clip]}>
          {mode === 'blur' ? (
            <BlurView intensity={spec.blurIntensity} tint={BLUR_TINTS[material][scheme]} style={StyleSheet.absoluteFill} />
          ) : null}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: veil }]} />
          {showReflections ? (
            <View
              style={[
                styles.sheen,
                { experimental_backgroundImage: `linear-gradient(180deg, ${glass.sheen[0]} 0%, ${glass.sheen[1]} 100%)` },
              ]}
            />
          ) : null}
        </View>
        <View
          style={[
            StyleSheet.absoluteFill,
            shape,
            styles.rim,
            showReflections
              ? {
                  borderTopColor: glass.rimLight,
                  borderLeftColor: glass.rimLight,
                  borderBottomColor: glass.rimShade,
                  borderRightColor: glass.rimShade,
                }
              : { borderColor: colors.border },
          ]}
        />
      </Animated.View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  // Reflet sur la moitié haute, comme la lumière d’un plafond sur une vitre bombée.
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
  rim: { borderWidth: 1 },
});
