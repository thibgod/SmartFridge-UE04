import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { HEADING_FONT_SCALE, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import { useProducts } from '@/features/products/ProductsProvider';
import { useSettings } from '@/features/settings/SettingsProvider';
import type { IconName } from '@/types/content';
import { haptics } from '@/utils/haptics';
import { goBack } from '@/utils/navigation';

interface Step {
  icon: IconName;
  title: string;
  text: string;
  points: string[];
}

const STEPS: Step[] = [
  {
    icon: 'leaf',
    title: 'Bienvenue dans SmartFridge',
    text: 'Le petit assistant qui vous aide à consommer avant de jeter.',
    points: [
      'Ajoutez vos produits en un geste : code-barres, ticket de caisse ou saisie rapide.',
      'Voyez d’un coup d’œil ce qui périme bientôt, même depuis l’écran d’accueil.',
      'Cuisinez ce qui doit l’être grâce aux recettes guidées, et faites vos courses sans doublon.',
    ],
  },
  {
    icon: 'lock-closed',
    title: 'Vos données restent chez vous',
    text: 'Pas de compte, pas de publicité, pas de suivi.',
    points: [
      'Votre inventaire est enregistré uniquement sur ce téléphone.',
      'Tickets, dates et photos sont lus directement sur le téléphone : rien n’est envoyé.',
      'Pour reconnaître ou illustrer un produit, seul son code-barres ou son nom est envoyé (Open Food Facts, Wikimedia).',
      'Vous pouvez exporter une sauvegarde quand vous le souhaitez.',
    ],
  },
  {
    icon: 'notifications',
    title: 'Être prévenu à temps',
    text: 'Un rappel la veille de la date de péremption, à l’heure que vous choisissez.',
    points: [
      'Un seul rappel par jour, qui regroupe tous les produits concernés.',
      'Aucune notification publicitaire, seulement vos produits.',
      'Réglable à tout moment dans les réglages de l’app.',
    ],
  },
];

export default function OnboardingScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  // Dans un écran plein modal, les marges de sécurité sont appliquées explicitement.
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const { updateSettings } = useSettings();
  const { requestNotifications } = useProducts();
  const step = STEPS[index] ?? STEPS[0]!;
  const isLast = index === STEPS.length - 1;

  const finish = (enableReminders: boolean) => {
    haptics.success();
    if (enableReminders) requestNotifications();
    void updateSettings({ onboardingDone: true });
    goBack();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom }]}>
      <View style={styles.top}>
        {!isLast ? <Button label="Passer" variant="ghost" onPress={() => finish(false)} style={styles.skip} /> : null}
      </View>

      {/* Défilable : en très grand texte, le contenu ne passe plus sous les boutons. */}
      <ScrollView key={index} style={styles.flex} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.illustration}>
          <Ionicons name={step.icon} size={64} color={colors.primary} />
        </View>
        <Text maxFontSizeMultiplier={HEADING_FONT_SCALE} style={styles.title} accessibilityRole="header">
          {step.title}
        </Text>
        <Text style={styles.text}>{step.text}</Text>
        <View style={styles.points}>
          {step.points.map((point) => (
            <View key={point} style={styles.point}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
              <Text style={styles.pointText}>{point}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottom}>
        <View style={styles.dots} accessibilityLabel={`Étape ${index + 1} sur ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <View key={s.title} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        {isLast ? (
          <>
            <Button label="Activer les rappels" icon="notifications-outline" size="lg" onPress={() => finish(true)} />
            <Button label="Plus tard" variant="ghost" onPress={() => finish(false)} />
          </>
        ) : (
          <Button
            label="Continuer"
            icon="arrow-forward"
            size="lg"
            onPress={() => {
              haptics.select();
              setIndex((i) => i + 1);
            }}
          />
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xl },
  top: { alignItems: 'flex-end', minHeight: 48 },
  skip: { paddingHorizontal: spacing.md },
  flex: { flex: 1 },
  body: { flexGrow: 1, justifyContent: 'center', gap: spacing.md, paddingVertical: spacing.md },
  illustration: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: fontSize.heading, fontWeight: '800', color: colors.text, textAlign: 'center' },
  text: { fontSize: fontSize.bodyLarge, color: colors.textMuted, textAlign: 'center', lineHeight: 24 },
  points: {
    marginTop: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  point: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  pointText: { flex: 1, fontSize: fontSize.body, color: colors.text, lineHeight: 22 },
  bottom: { gap: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { width: 24, backgroundColor: colors.primary },
}));
