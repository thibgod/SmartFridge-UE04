import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type ErrorBoundaryProps } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, Share, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { appVersionLabel } from '@/constants/app';
import { darkPalette, fontSize, HEADING_FONT_SCALE, lightPalette, radius, spacing } from '@/theme/tokens';

/**
 * Écran affiché quand un écran plante, à la place d’une page blanche. Il ne dépend d’aucun
 * contexte de l’app (thème, base, réglages) : ce sont peut-être eux qui ont échoué.
 * Les données ne sont pas touchées ; « Réessayer » recharge l’interface.
 */
export function AppErrorScreen({ error, retry }: ErrorBoundaryProps) {
  const colors = useColorScheme() === 'dark' ? darkPalette : lightPalette;
  const [showDetails, setShowDetails] = useState(false);
  const details = `SmartFridge ${appVersionLabel()} · ${Platform.OS} ${String(Platform.Version)}\n${error.name}: ${error.message}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg }}>
        <View
          style={{
            alignSelf: 'center',
            width: 84,
            height: 84,
            borderRadius: 42,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.warningSoft,
          }}
        >
          <Ionicons name="construct-outline" size={38} color={colors.warning} />
        </View>
        <Text
          maxFontSizeMultiplier={HEADING_FONT_SCALE}
          accessibilityRole="header"
          style={{ fontSize: fontSize.heading, fontWeight: '800', color: colors.text, textAlign: 'center' }}
        >
          Oups, un écran a planté
        </Text>
        <Text style={{ fontSize: fontSize.bodyLarge, lineHeight: 24, color: colors.textMuted, textAlign: 'center' }}>
          Vos produits et réglages sont intacts : ils restent enregistrés sur ce téléphone. Réessayez ; si le problème revient,
          fermez puis rouvrez l’application.
        </Text>

        <Pressable
          onPress={() => void retry()}
          accessibilityRole="button"
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            minHeight: 54,
            borderRadius: radius.lg,
            backgroundColor: pressed ? colors.primaryPressed : colors.primary,
          })}
        >
          <Ionicons name="refresh" size={20} color={colors.onPrimary} />
          <Text style={{ fontSize: fontSize.bodyLarge, fontWeight: '800', color: colors.onPrimary }}>Réessayer</Text>
        </Pressable>

        {/* Si c’est l’écran ouvert qui plante, réessayer le rouvrirait : on repart de l’accueil. */}
        <Pressable
          onPress={() => {
            try {
              router.replace('/');
            } catch {
              // Navigation indisponible (plantage au démarrage) : le simple rechargement suffit.
            }
            void retry();
          }}
          accessibilityRole="button"
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing.sm,
            minHeight: 50,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          })}
        >
          <Ionicons name="home-outline" size={19} color={colors.primary} />
          <Text style={{ fontSize: fontSize.bodyLarge, fontWeight: '700', color: colors.primary }}>Retour à l’accueil</Text>
        </Pressable>

        <Pressable
          onPress={() => setShowDetails((shown) => !shown)}
          accessibilityRole="button"
          accessibilityState={{ expanded: showDetails }}
          style={{ alignSelf: 'center', padding: spacing.sm }}
        >
          <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.primary }}>
            {showDetails ? 'Masquer le détail' : 'Détail technique'}
          </Text>
        </Pressable>

        {showDetails ? (
          <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceMuted }}>
            <Text
              selectable
              style={{
                fontSize: fontSize.caption,
                color: colors.textMuted,
                fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
              }}
            >
              {details}
            </Text>
            {/* Partage volontaire seulement : l’app n’envoie jamais de rapport d’erreur toute seule. */}
            <Pressable onPress={() => void Share.share({ message: details }).catch(() => undefined)} accessibilityRole="button">
              <Text style={{ fontSize: fontSize.body, fontWeight: '700', color: colors.primary }}>Partager le détail</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
