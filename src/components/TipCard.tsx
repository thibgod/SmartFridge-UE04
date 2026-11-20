import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PhotoCredit } from '@/components/PhotoCredit';
import { TIP_IMAGES } from '@/data/foodImages';
import { useCatalogImage } from '@/features/images/ImagesProvider';
import { IMAGE_HEADERS } from '@/services/images/foodImages';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { Tip } from '@/types/content';

/** Couleur de chaque fiche, en clair et en sombre. */
export function tipTone(tone: Tip['tone'], isDark: boolean): { fg: string; bg: string } {
  const light = {
    green: { fg: '#2E7D32', bg: '#E1F1E2' },
    amber: { fg: '#9C4A00', bg: '#FDEBD3' },
    blue: { fg: '#2B5F8A', bg: '#E2EDF6' },
    rose: { fg: '#A3373A', bg: '#F8E3E1' },
    sand: { fg: '#7A5A1E', bg: '#F3E9D2' },
    mint: { fg: '#1F6E6A', bg: '#DDF0EE' },
  };
  const dark = {
    green: { fg: '#86D896', bg: '#1B3222' },
    amber: { fg: '#FFBE75', bg: '#3A2B16' },
    blue: { fg: '#93C6F0', bg: '#1A2C3B' },
    rose: { fg: '#FF9A8F', bg: '#3A1E1B' },
    sand: { fg: '#E6C483', bg: '#33291A' },
    mint: { fg: '#7FD6CF', bg: '#163230' },
  };
  return (isDark ? dark : light)[tone];
}

/** Photo d’une fiche conseil, avec repli sur l’icône colorée. */
export function TipImage({
  tip,
  style,
  width = 600,
  creditBottom,
}: {
  tip: Tip;
  style?: object;
  width?: number;
  /** Affiche le crédit de la photo (affichage en grand), à cette distance du bas. */
  creditBottom?: number;
}) {
  const { isDark } = useTheme();
  const tone = tipTone(tip.tone, isDark);
  const uri = useCatalogImage(TIP_IMAGES[tip.id], width);
  const [failed, setFailed] = useState(false);
  return (
    <View style={[styles.frame, { backgroundColor: tone.bg }, style]}>
      <Ionicons name={tip.icon} size={36} color={tone.fg} />
      {uri && !failed ? (
        <Image
          source={{ uri, headers: IMAGE_HEADERS }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="disk"
          transition={200}
          onError={() => setFailed(true)}
          accessible={false}
        />
      ) : null}
      {uri && !failed && creditBottom !== undefined ? <PhotoCredit uri={uri} style={{ bottom: creditBottom }} /> : null}
    </View>
  );
}

/** Tuile de la grille des conseils : photo, pastille thématique et titre. */
function TipTileComponent({ tip, width }: { tip: Tip; width: number }) {
  const { isDark } = useTheme();
  const tileStyles = useTileStyles();
  const tone = tipTone(tip.tone, isDark);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/tip/[id]', params: { id: tip.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${tip.title}. ${tip.subtitle}`}
      style={({ pressed }) => [tileStyles.card, { width }, pressed && tileStyles.pressed]}
    >
      <View>
        <TipImage tip={tip} style={{ height: width * 0.62 }} width={400} />
        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.25)']} style={tileStyles.shade} pointerEvents="none" />
        <View style={[tileStyles.icon, { backgroundColor: tone.bg }]}>
          <Ionicons name={tip.icon} size={16} color={tone.fg} />
        </View>
      </View>
      <View style={tileStyles.body}>
        <Text style={tileStyles.title} numberOfLines={2}>
          {tip.title}
        </Text>
        <Text style={tileStyles.subtitle} numberOfLines={2}>
          {tip.subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

export const TipTile = memo(TipTileComponent);

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});

const useTileStyles = makeStyles(({ colors, shadow }) => ({
  card: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  pressed: { opacity: 0.85 },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 40 },
  icon: {
    position: 'absolute',
    left: spacing.sm,
    bottom: -14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  body: { padding: spacing.md, paddingTop: spacing.lg, gap: 3, minHeight: 92 },
  title: { fontSize: fontSize.body, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: fontSize.caption, color: colors.textMuted },
}));
