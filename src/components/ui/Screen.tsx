import type { PropsWithChildren, ReactNode } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fontSize, makeStyles, spacing } from '@/theme';

interface ScreenHeaderProps {
  title: string;
  /** Petite ligne au-dessus du titre (ex. la date du jour). */
  eyebrow?: string;
  subtitle?: string;
  right?: ReactNode;
}

export function ScreenHeader({ title, eyebrow, subtitle, right }: ScreenHeaderProps) {
  const styles = useStyles();
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

/** Conteneur d’écran d’onglet : fond du thème et marges de sécurité en haut. */
export function Screen({ children }: PropsWithChildren) {
  const styles = useStyles();
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      {children}
    </SafeAreaView>
  );
}

interface SectionTitleProps {
  title: string;
  action?: ReactNode;
  caption?: string;
}

export function SectionTitle({ title, action, caption }: SectionTitleProps) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
        {action}
      </View>
      {caption ? <Text style={styles.sectionCaption}>{caption}</Text> : null}
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  headerText: { flex: 1 },
  eyebrow: {
    fontSize: fontSize.caption,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  title: { fontSize: fontSize.display, fontWeight: '800', color: colors.text, letterSpacing: -0.6 },
  subtitle: { fontSize: fontSize.body, color: colors.textMuted, marginTop: 2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  section: { marginTop: spacing.xl, marginBottom: spacing.md, gap: 2 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  sectionTitle: { flex: 1, fontSize: fontSize.title - 1, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  sectionCaption: { fontSize: fontSize.caption + 1, color: colors.textMuted },
}));
