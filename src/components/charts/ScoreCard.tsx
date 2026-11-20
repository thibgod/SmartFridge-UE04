import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { ProgressRing } from '@/components/ui/ProgressRing';
import { CHROME_FONT_SCALE, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import { pluralize } from '@/utils/text';

interface ScoreCardProps {
  /** 0 à 100, part des produits consommés. */
  score: number;
  previous: number | null;
  consumed: number;
  closed: number;
}

function verdict(score: number): { title: string; message: string } {
  if (score >= 85) return { title: 'Excellent', message: 'Vous gaspillez très peu. Continuez comme ça !' };
  if (score >= 65) return { title: 'Bien', message: 'Les recettes anti-gaspi peuvent vous aider à progresser.' };
  return { title: 'À améliorer', message: 'Gardez un œil sur « À consommer vite » chaque jour.' };
}

/** Score anti-gaspi : une seule information à retenir, avec sa tendance. */
export function ScoreCard({ score, previous, consumed, closed }: ScoreCardProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const tone = score >= 85 ? colors.success : score >= 65 ? colors.warning : colors.danger;
  const { title, message } = verdict(score);
  const diff = previous === null ? null : score - previous;

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`Score anti-gaspi : ${score} sur 100, ${title}. ${message}${diff ? ` ${diff > 0 ? 'En hausse' : 'En baisse'} de ${Math.abs(diff)} points.` : ''}`}
    >
      <ProgressRing value={score / 100} size={118} strokeWidth={11} color={tone}>
        {/* Le chiffre doit tenir dans l’anneau : son agrandissement est plafonné. */}
        <Text style={[styles.score, { color: tone }]} maxFontSizeMultiplier={1}>
          {score}
        </Text>
        <Text style={styles.outOf} maxFontSizeMultiplier={1}>
          / 100
        </Text>
      </ProgressRing>
      <View style={styles.text}>
        <Text style={styles.eyebrow} maxFontSizeMultiplier={CHROME_FONT_SCALE}>
          Score anti-gaspi
        </Text>
        <Text style={[styles.title, { color: tone }]} maxFontSizeMultiplier={CHROME_FONT_SCALE}>
          {title}
        </Text>
        <Text style={styles.message}>{message}</Text>
        <Text style={styles.detail}>
          {pluralize(consumed, 'produit consommé', 'produits consommés')} sur {closed}
        </Text>
        {diff ? (
          <View style={styles.delta}>
            <Ionicons
              name={diff > 0 ? 'trending-up' : 'trending-down'}
              size={16}
              color={diff > 0 ? colors.success : colors.danger}
            />
            <Text style={[styles.deltaText, { color: diff > 0 ? colors.success : colors.danger }]}>
              {diff > 0 ? '+' : '−'}
              {Math.abs(diff)} pts vs période précédente
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  score: { fontSize: 34, fontWeight: '900', letterSpacing: -1, lineHeight: 38 },
  outOf: { fontSize: fontSize.caption, color: colors.textMuted, fontWeight: '600' },
  text: { flex: 1, gap: 3 },
  eyebrow: {
    fontSize: fontSize.micro + 1,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: { fontSize: fontSize.title, fontWeight: '800' },
  message: { fontSize: fontSize.caption + 1, color: colors.text, lineHeight: 19 },
  detail: { fontSize: fontSize.caption, color: colors.textMuted },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  deltaText: { fontSize: fontSize.caption, fontWeight: '700' },
}));
