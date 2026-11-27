import type { SQLiteDatabase } from 'expo-sqlite';

import { isAccentId } from '@/theme/accents';
import { isMascotId } from '@/features/mascot/mascots';

import {
  DEFAULT_SETTINGS,
  HOUSEHOLD_LIMITS,
  REMINDER_DAYS_OPTIONS,
  THEME_OPTIONS,
  URGENT_THRESHOLD_OPTIONS,
  type AppSettings,
} from '@/types/settings';

/**
 * Valide une valeur lue (base ou sauvegarde importée) : toute valeur inattendue
 * retombe sur la valeur par défaut plutôt que de corrompre l’état de l’app.
 */
export function sanitizeSettings(raw: Partial<Record<keyof AppSettings, unknown>>): AppSettings {
  const hour = raw.reminderHour;
  return {
    remindersEnabled: typeof raw.remindersEnabled === 'boolean' ? raw.remindersEnabled : DEFAULT_SETTINGS.remindersEnabled,
    reminderHour:
      typeof hour === 'number' && Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : DEFAULT_SETTINGS.reminderHour,
    reminderDaysBefore: REMINDER_DAYS_OPTIONS.includes(raw.reminderDaysBefore as never)
      ? (raw.reminderDaysBefore as AppSettings['reminderDaysBefore'])
      : DEFAULT_SETTINGS.reminderDaysBefore,
    urgentThresholdDays: URGENT_THRESHOLD_OPTIONS.includes(raw.urgentThresholdDays as never)
      ? (raw.urgentThresholdDays as AppSettings['urgentThresholdDays'])
      : DEFAULT_SETTINGS.urgentThresholdDays,
    onboardingDone: typeof raw.onboardingDone === 'boolean' ? raw.onboardingDone : DEFAULT_SETTINGS.onboardingDone,
    swipeHintSeen: typeof raw.swipeHintSeen === 'boolean' ? raw.swipeHintSeen : DEFAULT_SETTINGS.swipeHintSeen,
    themePreference: THEME_OPTIONS.includes(raw.themePreference as never)
      ? (raw.themePreference as AppSettings['themePreference'])
      : DEFAULT_SETTINGS.themePreference,
    accent: isAccentId(raw.accent) ? raw.accent : DEFAULT_SETTINGS.accent,
    mascot: isMascotId(raw.mascot) ? raw.mascot : DEFAULT_SETTINGS.mascot,
    autoImages: typeof raw.autoImages === 'boolean' ? raw.autoImages : DEFAULT_SETTINGS.autoImages,
    receiptUsage: sanitizeReceiptUsage(raw.receiptUsage),
    premiumCached: raw.premiumCached === true,
    autoBackup: typeof raw.autoBackup === 'boolean' ? raw.autoBackup : DEFAULT_SETTINGS.autoBackup,
    currentPlaceId:
      typeof raw.currentPlaceId === 'string' && raw.currentPlaceId.length > 0
        ? raw.currentPlaceId
        : DEFAULT_SETTINGS.currentPlaceId,
    lastAutoBackupAt:
      typeof raw.lastAutoBackupAt === 'string' && !Number.isNaN(Date.parse(raw.lastAutoBackupAt)) ? raw.lastAutoBackupAt : null,
    seenBadges:
      Array.isArray(raw.seenBadges) && raw.seenBadges.every((id) => typeof id === 'string') ? (raw.seenBadges as string[]) : null,
    household: sanitizeHousehold(raw.household),
  };
}

function sanitizeHousehold(raw: unknown): AppSettings['household'] {
  if (typeof raw !== 'object' || raw === null) return null;
  const { adults, children } = raw as Record<string, unknown>;
  const valid = (value: unknown, { min, max }: { min: number; max: number }) =>
    typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
  if (!valid(adults, HOUSEHOLD_LIMITS.adults) || !valid(children, HOUSEHOLD_LIMITS.children)) return null;
  return { adults: adults as number, children: children as number };
}

function sanitizeReceiptUsage(raw: unknown): AppSettings['receiptUsage'] {
  if (typeof raw !== 'object' || raw === null) return null;
  const { month, count } = raw as Record<string, unknown>;
  if (typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) return null;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0) return null;
  return { month, count };
}

export function createSettingsRepository(db: SQLiteDatabase) {
  return {
    async load(): Promise<AppSettings> {
      const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
      const raw: Record<string, unknown> = {};
      for (const row of rows) {
        try {
          raw[row.key] = JSON.parse(row.value);
        } catch {
          // Valeur illisible : ignorée, la valeur par défaut s’applique.
        }
      }
      return sanitizeSettings(raw);
    },

    async save(patch: Partial<AppSettings>): Promise<void> {
      await db.withTransactionAsync(async () => {
        for (const [key, value] of Object.entries(patch)) {
          await db.runAsync(
            'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
            key,
            JSON.stringify(value),
          );
        }
      });
    },
  };
}
