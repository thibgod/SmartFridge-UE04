import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccentPicker } from '@/components/form/AccentPicker';
import { AppIconPicker } from '@/components/form/AppIconPicker';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { SegmentedControl, type Segment } from '@/components/ui/SegmentedControl';
import { SettingsAction, SettingsDivider, SettingsLabel, SettingsSection, SettingsSwitch } from '@/components/ui/SettingsSection';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import { appVersionLabel, IS_BETA } from '@/constants/app';
import { useToast } from '@/features/feedback/ToastProvider';
import { useImages } from '@/features/images/ImagesProvider';
import { usePlaces } from '@/features/places/PlacesProvider';
import { PLANS } from '@/features/premium/plans';
import { usePremium } from '@/features/premium/PremiumProvider';
import { useProducts } from '@/features/products/ProductsProvider';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useDataActions } from '@/features/settings/useDataActions';
import { useNotificationStatus } from '@/hooks/useNotificationStatus';
import {
  REMINDER_DAYS_OPTIONS,
  REMINDER_HOUR_OPTIONS,
  URGENT_THRESHOLD_OPTIONS,
  type ReminderDaysBefore,
  type ThemePreference,
} from '@/types/settings';
import { supportsAppIcons } from '@/services/appIcon';
import type { PermissionState } from '@/services/notifications';
import { haptics } from '@/utils/haptics';
import { pluralize } from '@/utils/text';

/** Où trouver les copies : dans l’app Fichiers sur iPhone, dans la sauvegarde Google sur Android. */
function autoBackupDescription(isPremium: boolean, enabled: boolean, lastAt: string | null): string {
  if (!isPremium) return 'Une copie chaque jour, gardée 7 jours. Inclus dans SmartFridge Premium.';
  if (!enabled) return 'Une copie chaque jour, gardée 7 jours.';
  const where =
    Platform.OS === 'ios' ? 'App Fichiers › Sur mon iPhone › SmartFridge.' : 'Incluse dans la sauvegarde Google du téléphone.';
  if (!lastAt) return `Première copie au prochain lancement. ${where}`;
  const date = new Date(lastAt);
  const when = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `Dernière copie le ${when} à ${time}. ${where}`;
}

const DAYS_LABEL: Record<ReminderDaysBefore, string> = { 1: 'La veille', 2: '2 jours avant', 3: '3 jours avant' };

const THEME_SEGMENTS: Segment<ThemePreference>[] = [
  { value: 'system', label: 'Auto', icon: 'phone-portrait-outline', accessibilityLabel: 'Suivre le téléphone' },
  { value: 'light', label: 'Clair', icon: 'sunny-outline' },
  { value: 'dark', label: 'Sombre', icon: 'moon-outline' },
];

export default function SettingsScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { clearCache } = useImages();
  const { showToast } = useToast();
  const { settings, updateSettings } = useSettings();
  const { requestNotifications, remindersVersion } = useProducts();
  const { permission, scheduledCount } = useNotificationStatus(remindersVersion);
  const data = useDataActions();
  const premium = usePremium();
  const { places } = usePlaces();
  const [restoring, setRestoring] = useState(false);

  const update = (patch: Parameters<typeof updateSettings>[0]) => {
    haptics.select();
    void updateSettings(patch);
  };

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}>
      <SettingsSection
        title="SmartFridge Premium"
        icon="sparkles-outline"
        footer={
          premium.isPremium
            ? 'L’abonnement se gère et se résilie dans les réglages de votre compte App Store ou Google Play.'
            : 'Produits et tickets illimités, toutes les recettes, le widget et le Bilan complet. Essai gratuit de 7 jours.'
        }
      >
        {premium.isPremium ? (
          <>
            <SettingsLabel
              label="Premium est actif"
              description={
                premium.activePlan
                  ? `Formule ${PLANS[premium.activePlan].title.toLowerCase()}. Merci !`
                  : 'Merci de soutenir SmartFridge !'
              }
            />
            <SettingsDivider />
            <SettingsAction label="Gérer mon abonnement" icon="card-outline" onPress={() => void premium.manage()} />
          </>
        ) : (
          <>
            <SettingsAction label="Découvrir Premium" icon="sparkles-outline" onPress={() => premium.showPaywall('settings')} />
            <SettingsDivider />
            <SettingsAction
              label={restoring ? 'Recherche de vos achats…' : 'Restaurer mes achats'}
              icon="refresh-outline"
              trailing={restoring ? <ActivityIndicator color={colors.primary} /> : undefined}
              onPress={() => {
                if (restoring) return;
                setRestoring(true);
                void premium
                  .restore()
                  .then((restored) =>
                    showToast({
                      tone: restored ? 'success' : 'neutral',
                      message: restored ? 'Abonnement Premium restauré.' : 'Aucun abonnement actif n’a été trouvé.',
                    }),
                  )
                  .finally(() => setRestoring(false));
              }}
            />
          </>
        )}
      </SettingsSection>

      <SettingsSection
        title="Apparence"
        icon="color-palette-outline"
        footer="« Auto » suit le mode clair ou sombre de votre téléphone."
      >
        <SettingsLabel label="Thème">
          <SegmentedControl
            segments={THEME_SEGMENTS}
            value={settings.themePreference}
            onChange={(value) => update({ themePreference: value })}
          />
        </SettingsLabel>
        <SettingsDivider />
        <SettingsLabel
          label="Couleur"
          description={premium.isPremium ? undefined : 'Les autres couleurs sont incluses dans SmartFridge Premium.'}
        >
          <AccentPicker
            value={settings.accent}
            locked={!premium.isPremium}
            onChange={(accent) => update({ accent })}
            onLockedPress={() => premium.showPaywall('settings')}
          />
        </SettingsLabel>
        <SettingsDivider />
        {supportsAppIcons ? (
          <>
            <SettingsLabel label="Icône de l’app">
              <AppIconPicker
                locked={!premium.isPremium}
                onLockedPress={() => premium.showPaywall('settings')}
                onError={() => showToast({ tone: 'error', message: 'L’icône n’a pas pu être changée.' })}
              />
            </SettingsLabel>
            <SettingsDivider />
          </>
        ) : null}
        <SettingsSwitch
          label="Illustrations automatiques"
          description="Photos sous licence libre (Wikimedia), créditées dans « Crédits et licences ». Seul le nom du produit est envoyé."
          value={settings.autoImages}
          onValueChange={(value) => update({ autoImages: value })}
        />
      </SettingsSection>

      <SettingsSection
        title="Rappels"
        icon="notifications-outline"
        footer={
          permission === 'granted' && settings.remindersEnabled && scheduledCount !== null
            ? `${pluralize(scheduledCount, 'rappel programmé', 'rappels programmés')} sur cet appareil.`
            : undefined
        }
      >
        <PermissionBanner permission={permission} onRequest={requestNotifications} />
        <SettingsSwitch
          label="Rappels de péremption"
          description="Une notification avant qu’un produit ne périme."
          value={settings.remindersEnabled}
          onValueChange={(value) => update({ remindersEnabled: value })}
        />
        {settings.remindersEnabled ? (
          <>
            <SettingsDivider />
            <SettingsLabel label="Me prévenir">
              <View style={styles.chips}>
                {REMINDER_DAYS_OPTIONS.map((days) => (
                  <Chip
                    key={days}
                    label={DAYS_LABEL[days]}
                    selected={settings.reminderDaysBefore === days}
                    onPress={() => update({ reminderDaysBefore: days })}
                  />
                ))}
              </View>
            </SettingsLabel>
            <SettingsDivider />
            <SettingsLabel label="À quelle heure">
              <View style={styles.chips}>
                {REMINDER_HOUR_OPTIONS.map((hour) => (
                  <Chip
                    key={hour}
                    label={`${hour} h`}
                    accessibilityLabel={`${hour} heures`}
                    selected={settings.reminderHour === hour}
                    onPress={() => update({ reminderHour: hour })}
                  />
                ))}
              </View>
            </SettingsLabel>
          </>
        ) : null}
      </SettingsSection>

      <SettingsSection
        title="Mon frigo"
        icon="file-tray-full-outline"
        footer="Utilisé pour le bandeau d’accueil, les badges orange et les recettes prioritaires."
      >
        <SettingsLabel label="« À consommer vite » à partir de">
          <View style={styles.chips}>
            {URGENT_THRESHOLD_OPTIONS.map((days) => (
              <Chip
                key={days}
                label={`${days} jours`}
                selected={settings.urgentThresholdDays === days}
                onPress={() => update({ urgentThresholdDays: days })}
              />
            ))}
          </View>
        </SettingsLabel>
        <SettingsDivider />
        <SettingsAction
          label="Mes lieux"
          icon="business-outline"
          description={
            places.length > 0
              ? `Maison et ${pluralize(places.length, 'autre lieu', 'autres lieux')}`
              : premium.isPremium
                ? 'Bureau, résidence secondaire, cave…'
                : 'Plusieurs frigos et lieux avec Premium'
          }
          onPress={() => router.push('/places')}
        />
      </SettingsSection>

      <SettingsSection
        title="Sauvegarde"
        icon="cloud-download-outline"
        footer="La sauvegarde est un simple fichier, gardé sur votre téléphone ou là où vous l’enregistrez (Fichiers, AirDrop, e-mail…). SmartFridge n’envoie rien à aucun serveur."
      >
        {Platform.OS !== 'web' ? (
          <>
            <SettingsSwitch
              label="Sauvegarde automatique"
              description={autoBackupDescription(premium.isPremium, settings.autoBackup, settings.lastAutoBackupAt)}
              value={premium.isPremium && settings.autoBackup}
              onValueChange={(value) => (premium.isPremium ? update({ autoBackup: value }) : premium.showPaywall('settings'))}
            />
            <SettingsDivider />
          </>
        ) : null}
        <SettingsAction
          label="Exporter mes données"
          icon="share-outline"
          description="Produits, historique et réglages"
          onPress={() => void data.exportData()}
          trailing={data.busy === 'export' ? <ActivityIndicator color={colors.primary} /> : undefined}
        />
        <SettingsDivider />
        <SettingsAction
          label="Restaurer une sauvegarde"
          icon="download-outline"
          description="Depuis un fichier SmartFridge (.json)"
          onPress={() => void data.importData()}
          trailing={data.busy === 'import' ? <ActivityIndicator color={colors.primary} /> : undefined}
        />
      </SettingsSection>

      <SettingsSection title="Données" icon="server-outline">
        <SettingsAction
          label="Effacer l’historique"
          icon="refresh-outline"
          description="Remet les statistiques à zéro"
          onPress={data.confirmClearHistory}
        />
        <SettingsDivider />
        <SettingsAction
          label="Vider le cache des illustrations"
          icon="images-outline"
          description="Les images seront recherchées à nouveau"
          onPress={() => {
            clearCache()
              .then(() => showToast({ tone: 'neutral', message: 'Cache des illustrations vidé.' }))
              .catch(() => showToast({ tone: 'error', message: 'Impossible de vider le cache.' }));
          }}
        />
        <SettingsDivider />
        <SettingsAction label="Tout effacer" icon="trash-outline" tone="danger" onPress={data.confirmClearAll} />
      </SettingsSection>

      {IS_BETA ? (
        <SettingsSection title="Version bêta" icon="flask-outline">
          <View style={styles.about}>
            <Text style={styles.aboutText}>
              Merci de tester SmartFridge ! Un bug, une idée ? Faites une capture d’écran : TestFlight propose alors d’envoyer un
              commentaire directement au développeur. Vous pouvez aussi passer par l’app TestFlight, rubrique « Envoyer un
              commentaire ».
            </Text>
          </View>
        </SettingsSection>
      ) : null}

      <SettingsSection title="À propos" icon="leaf-outline">
        <SettingsAction
          label="Revoir la présentation"
          icon="play-circle-outline"
          onPress={() => {
            void updateSettings({ onboardingDone: false });
            router.push('/onboarding');
          }}
        />
        <SettingsDivider />
        <SettingsAction label="Confidentialité" icon="shield-checkmark-outline" onPress={() => router.push('/privacy')} />
        <SettingsDivider />
        <SettingsAction label="Crédits et licences" icon="ribbon-outline" onPress={() => router.push('/credits')} />
        <SettingsDivider />
        <View style={styles.about}>
          <Text style={styles.aboutTitle}>
            SmartFridge {appVersionLabel()}
            {IS_BETA ? ' · bêta' : ''}
          </Text>
          <Text style={styles.aboutText}>
            Vos données restent sur cet appareil : pas de compte, pas de publicité, pas de suivi. Seuls le code-barres (Open Food
            Facts) et, si les illustrations sont activées, le nom d’un produit (Wikimedia) sont envoyés pour reconnaître ou
            illustrer un aliment.
          </Text>
        </View>
      </SettingsSection>
    </ScrollView>
  );
}

function PermissionBanner({ permission, onRequest }: { permission: PermissionState | null; onRequest: () => void }) {
  const styles = useStyles();
  if (permission === null || permission === 'granted') return null;
  const denied = permission === 'denied';
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.bannerText}>
        {denied
          ? 'Les notifications sont désactivées pour SmartFridge. Activez-les dans les réglages de votre téléphone pour recevoir les rappels.'
          : 'Autorisez les notifications pour être prévenu avant qu’un produit ne périme.'}
      </Text>
      <Button
        label={denied ? 'Ouvrir les réglages' : 'Autoriser les notifications'}
        icon={denied ? 'settings-outline' : 'notifications-outline'}
        onPress={denied ? () => void Linking.openSettings() : onRequest}
      />
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  content: { padding: spacing.lg },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  banner: {
    margin: spacing.md,
    padding: spacing.md,
    gap: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
  },
  bannerText: { fontSize: fontSize.body, color: colors.text, lineHeight: 21 },
  about: { padding: spacing.lg, gap: spacing.xs },
  aboutTitle: { fontSize: fontSize.bodyLarge, fontWeight: '700', color: colors.text },
  aboutText: { fontSize: fontSize.body, color: colors.textMuted, lineHeight: 21 },
}));
