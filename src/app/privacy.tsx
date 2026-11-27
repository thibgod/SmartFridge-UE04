import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PRIVACY_INTRO, PRIVACY_SECTIONS, PRIVACY_UPDATED_AT } from '@/data/privacy';
import { fontSize, makeStyles, spacing } from '@/theme';

/** Politique de confidentialité, lisible sans connexion (même texte que PRIVACY.md). */
export default function PrivacyScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
    >
      <Text style={styles.updated}>Dernière mise à jour : {PRIVACY_UPDATED_AT}</Text>
      <Text style={styles.intro}>{PRIVACY_INTRO}</Text>
      {PRIVACY_SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.title} accessibilityRole="header">
            {section.title}
          </Text>
          {section.paragraphs?.map((paragraph) => (
            <Text key={paragraph} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
          {section.items?.map((item) => (
            <View key={item.label} style={styles.item}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.paragraph}>
                <Text style={styles.bold}>{item.label}</Text> : {item.text}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  content: { padding: spacing.lg, gap: spacing.lg, width: '100%', maxWidth: 760, alignSelf: 'center' },
  updated: { fontSize: fontSize.caption, color: colors.textMuted },
  intro: { fontSize: fontSize.bodyLarge, lineHeight: 25, color: colors.text, fontWeight: '600' },
  section: { gap: spacing.sm },
  title: { fontSize: fontSize.title - 2, fontWeight: '800', color: colors.text },
  paragraph: { flex: 1, fontSize: fontSize.body, lineHeight: 22, color: colors.textMuted },
  item: { flexDirection: 'row', gap: spacing.sm },
  bullet: { fontSize: fontSize.body, lineHeight: 22, color: colors.primary, fontWeight: '800' },
  bold: { fontWeight: '700', color: colors.text },
}));
