import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { TipTile, tipTone } from '@/components/TipCard';
import { Screen, ScreenHeader, SectionTitle } from '@/components/ui/Screen';
import { TIPS } from '@/data/tips';
import { useLayout } from '@/hooks/useLayout';
import { HEADING_FONT_SCALE, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';

/** La distinction DLC / DDM est le levier anti-gaspi n° 1 : elle est mise en avant en tête d’écran. */
const DATE_TIPS = ['dlc', 'ddm'] as const;

export default function TipsScreen() {
  const styles = useStyles();
  const { isDark } = useTheme();
  const { gutter, contentWidth, size } = useLayout();
  const columns = size === 'compact' ? 2 : 3;
  const innerWidth = contentWidth - spacing.lg * 2;
  const tileWidth = (innerWidth - spacing.md * (columns - 1)) / columns;
  const others = TIPS.filter((tip) => !DATE_TIPS.includes(tip.id as (typeof DATE_TIPS)[number]));

  return (
    <Screen>
      <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}>
        <ScreenHeader title="Conseils" subtitle="Les bons réflexes pour jeter moins, sans stress." />

        <SectionTitle title="DLC ou DDM ?" caption="Bien lire la date évite de jeter des produits encore bons." />
        <View style={styles.compare}>
          {DATE_TIPS.map((id) => {
            const tip = TIPS.find((t) => t.id === id);
            if (!tip) return null;
            const tone = tipTone(tip.tone, isDark);
            const isDlc = id === 'dlc';
            return (
              <Pressable
                key={id}
                onPress={() => router.push({ pathname: '/tip/[id]', params: { id } })}
                accessibilityRole="button"
                accessibilityLabel={tip.title}
                style={({ pressed }) => [styles.compareCard, { backgroundColor: tone.bg }, pressed && styles.pressed]}
              >
                <View style={styles.compareHead}>
                  <Text maxFontSizeMultiplier={HEADING_FONT_SCALE} style={[styles.compareCode, { color: tone.fg }]}>
                    {isDlc ? 'DLC' : 'DDM'}
                  </Text>
                  <Ionicons name={tip.icon} size={20} color={tone.fg} />
                </View>
                <Text style={[styles.compareQuote, { color: tone.fg }]}>
                  {isDlc ? '« À consommer jusqu’au »' : '« À consommer de préférence avant »'}
                </Text>
                <Text style={styles.compareText}>
                  {isDlc
                    ? 'Date limite stricte : produits frais, viande, poisson.'
                    : 'Date indicative : souvent encore bon après.'}
                </Text>
                <Text style={[styles.compareMore, { color: tone.fg }]}>En savoir plus ›</Text>
              </Pressable>
            );
          })}
        </View>

        <SectionTitle title="Bien conserver" />
        <View style={styles.grid}>
          {others.map((tip) => (
            <TipTile key={tip.id} tip={tip} width={tileWidth} />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  content: { paddingBottom: spacing.xxl * 2 },
  compare: { flexDirection: 'row', gap: spacing.md },
  compareCard: { flex: 1, borderRadius: radius.xl, padding: spacing.lg, gap: spacing.sm },
  pressed: { opacity: 0.85 },
  compareHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  compareCode: { fontSize: fontSize.heading, fontWeight: '900', letterSpacing: 0.5 },
  compareQuote: { fontSize: fontSize.body, fontWeight: '800', lineHeight: 20 },
  compareText: { fontSize: fontSize.caption + 1, color: colors.text, lineHeight: 19 },
  compareMore: { fontSize: fontSize.caption, fontWeight: '800', marginTop: 'auto' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
}));
