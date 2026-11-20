import type { ReceiptUsage } from '@/features/premium/limits';
import type { AccentId } from '@/theme/accents';

export type ReminderDaysBefore = 1 | 2 | 3;
export type ThemePreference = 'system' | 'light' | 'dark';
export type UrgentThresholdDays = 2 | 3 | 5;

export interface AppSettings {
  remindersEnabled: boolean;
  /** Heure locale du rappel (0–23). */
  reminderHour: number;
  /** Nombre de jours avant la péremption. */
  reminderDaysBefore: ReminderDaysBefore;
  /** En dessous de ce nombre de jours, un produit est « à consommer vite ». */
  urgentThresholdDays: UrgentThresholdDays;
  onboardingDone: boolean;
  /** L’astuce « glisser un produit » a été comprise (ou le geste déjà utilisé). */
  swipeHintSeen: boolean;
  themePreference: ThemePreference;
  /** Couleur d’accent choisie (personnalisation Premium ; « Forêt » sans abonnement). */
  accent: AccentId;
  /** Illustrations automatiques (Wikimedia) pour les produits sans photo. */
  autoImages: boolean;
  /** Tickets de caisse lus ce mois-ci (limite de la version gratuite). */
  receiptUsage: ReceiptUsage | null;
  /**
   * Dernier état d’abonnement confirmé par le store : l’app démarre hors ligne sans retirer
   * Premium à un abonné. Revérifié à chaque lancement dès que le store répond.
   */
  premiumCached: boolean;
  /** Sauvegarde automatique quotidienne (Premium). */
  autoBackup: boolean;
  /** Date ISO de la dernière sauvegarde automatique réussie. */
  lastAutoBackupAt: string | null;
  /** Lieu affiché sur l’accueil (« maison » par défaut). */
  currentPlaceId: string;
  /** Badges dont la fiche a déjà été vue (fête de l’obtention) ; null tant que la fonction n’a jamais tourné. */
  seenBadges: string[] | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  remindersEnabled: true,
  reminderHour: 9,
  reminderDaysBefore: 1,
  urgentThresholdDays: 3,
  onboardingDone: false,
  swipeHintSeen: false,
  themePreference: 'system',
  accent: 'foret',
  autoImages: true,
  receiptUsage: null,
  premiumCached: false,
  autoBackup: true,
  lastAutoBackupAt: null,
  currentPlaceId: 'maison',
  seenBadges: null,
};

export const REMINDER_HOUR_OPTIONS = [8, 9, 12, 18, 20] as const;
export const REMINDER_DAYS_OPTIONS: readonly ReminderDaysBefore[] = [1, 2, 3];
export const URGENT_THRESHOLD_OPTIONS: readonly UrgentThresholdDays[] = [2, 3, 5];
export const THEME_OPTIONS: readonly ThemePreference[] = ['system', 'light', 'dark'];
