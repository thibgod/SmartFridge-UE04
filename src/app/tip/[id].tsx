import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { TipImage, tipTone } from '@/components/TipCard';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { TIPS } from '@/data/tips';
import { useModalTopInset } from '@/hooks/useModalTopInset';
import { HEADING_FONT_SCALE, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import { goBack } from '@/utils/navigation';

export default function TipScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const topInset = useModalTopInset();
  const tip = TIPS.find((t) => t.id === id);

  if (!tip) {
    return (
      <EmptyState
        icon="help-circle-outline"
        title="Conseil introuvable"
        message="Ce conseil n’existe plus."
        action={<Button label="Retour" onPress={goBack} />}
      />
    );
  }

  const tone = tipTone(tip.tone, isDark);
  const index = TIPS.findIndex((t) => t.id === tip.id);
  const next = TIPS[(index + 1) % TIPS.length];

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}>
        <View style={styles.hero}>
          <TipImage tip={tip} style={styles.heroImage} width={800} creditBottom={CREDIT_BOTTOM} />
          <LinearGradient colors={['rgba(0,0,0,0.35)', 'transparent']} style={styles.heroShade} pointerEvents="none" />
          <IconButton
            icon="close"
            label="Fermer"
            tone="onImage"
            size={40}
            onPress={goBack}
            style={[styles.close, { top: spacing.md + topInset }]}
          />
        </View>

        <View style={styles.sheet}>
          <View style={[styles.pill, { backgroundColor: tone.bg }]}>
            <Ionicons name={tip.icon} size={14} color={tone.fg} />
            <Text style={[styles.pillText, { color: tone.fg }]}>{tip.subtitle}</Text>
          </View>
          <Text maxFontSizeMultiplier={HEADING_FONT_SCALE} style={styles.title} accessibilityRole="header">
            {tip.title}
          </Text>
          <Text style={styles.intro}>{tip.intro}</Text>

          {tip.sections.map((section, i) => (
            <View key={section.heading ?? i} style={styles.section}>
              {section.heading ? <Text style={styles.heading}>{section.heading}</Text> : null}
              {section.bullets.map((bullet) => (
                <View key={bullet} style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle" size={20} color={tone.fg} />
                  <Text style={styles.bullet}>{bullet}</Text>
                </View>
              ))}
            </View>
          ))}

          {tip.caution ? (
            <View style={styles.caution} accessibilityRole="alert">
              <Ionicons name="information-circle" size={22} color={colors.info} />
              <Text style={styles.cautionText}>{tip.caution}</Text>
            </View>
          ) : null}

          {next && next.id !== tip.id ? (
            <Button
              label={`À lire ensuite : ${next.title}`}
              icon="arrow-forward"
              variant="tonal"
              style={styles.next}
              onPress={() => router.replace({ pathname: '/tip/[id]', params: { id: next.id } })}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const HERO = 240;
/** Le crédit photo reste visible au-dessus de la feuille arrondie qui recouvre le bas de la photo. */
const CREDIT_BOTTOM = radius.xxl + spacing.sm;

const useStyles = makeStyles(({ colors }) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: { height: HERO },
  heroImage: { width: '100%', height: HERO },
  heroShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 90 },
  close: { position: 'absolute', right: spacing.md },
  sheet: {
    marginTop: -radius.xxl,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    gap: spacing.md,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  pillText: { fontSize: fontSize.caption, fontWeight: '700' },
  title: { fontSize: fontSize.heading, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  intro: { fontSize: fontSize.bodyLarge - 1, color: colors.text, lineHeight: 24 },
  section: { gap: spacing.sm, marginTop: spacing.sm },
  heading: { fontSize: fontSize.bodyLarge, fontWeight: '800', color: colors.text },
  bulletRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  bullet: { flex: 1, fontSize: fontSize.body, color: colors.text, lineHeight: 22 },
  caution: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.infoSoft,
    marginTop: spacing.sm,
  },
  cautionText: { flex: 1, fontSize: fontSize.body, color: colors.text, lineHeight: 21 },
  next: { marginTop: spacing.lg },
}));
