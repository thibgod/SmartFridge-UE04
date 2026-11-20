import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Product } from '@/types/product';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { addDays, parseLocalDate } from '@/utils/date';

/**
 * Service unique de notifications locales.
 *
 * Stratégie : plutôt que d’annuler/reprogrammer au cas par cas, on calcule l’ensemble
 * des rappels attendus à partir des produits actifs puis on aligne les rappels planifiés
 * dessus (diff). C’est idempotent : aucun doublon, aucun rappel orphelin, quel que soit
 * l’enchaînement d’ajouts, éditions, clôtures ou suppressions.
 */

const CHANNEL_ID = 'expiry-reminders';
const IDENTIFIER_PREFIX = 'expiry-';
/** Délai minimal avant déclenchement pour qu’un rappel ait du sens. */
const MIN_LEAD_MS = 60_000;
/** iOS limite à 64 notifications locales en attente par app : on garde une marge. */
const MAX_SCHEDULED = 60;

/** Sous-ensemble des réglages utile aux rappels. */
export interface ReminderOptions {
  enabled: boolean;
  hour: number;
  daysBefore: number;
}

export const DEFAULT_REMINDER_OPTIONS: ReminderOptions = {
  enabled: DEFAULT_SETTINGS.remindersEnabled,
  hour: DEFAULT_SETTINGS.reminderHour,
  daysBefore: DEFAULT_SETTINGS.reminderDaysBefore,
};

interface ReminderPlan {
  identifier: string;
  /** Produit à ouvrir quand le rappel ne concerne qu’un seul produit. */
  productId?: string;
  productIds: string[];
  triggerAt: Date;
  title: string;
  body: string;
}

let initialized = false;

/** Version web (écran du frigo) : pas de notifications, c’est le téléphone qui prévient. */
const UNSUPPORTED = Platform.OS === 'web';

/** À appeler une fois au démarrage : affichage au premier plan + canal Android. */
export async function initNotifications(): Promise<void> {
  if (initialized || UNSUPPORTED) return;
  initialized = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  // Sur Android 13+, le canal doit exister avant la demande de permission.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Rappels de péremption',
      description: 'Vous prévient la veille de la date de péremption d’un produit.',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';

function toPermissionState(settings: Notifications.NotificationPermissionsStatus): PermissionState {
  if (settings.granted) return 'granted';
  const iosStatus = settings.ios?.status;
  if (
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL ||
    iosStatus === Notifications.IosAuthorizationStatus.EPHEMERAL
  ) {
    return 'granted';
  }
  return settings.canAskAgain ? 'undetermined' : 'denied';
}

export async function getPermissionState(): Promise<PermissionState> {
  if (UNSUPPORTED) return 'denied';
  return toPermissionState(await Notifications.getPermissionsAsync());
}

/** Demande la permission seulement si l’utilisateur n’a pas encore répondu. */
export async function ensurePermission(): Promise<PermissionState> {
  const current = await getPermissionState();
  if (current !== 'undetermined') return current;
  const result = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return toPermissionState(result);
}

/** Moment du rappel : N jours avant la péremption, à l’heure choisie (heure locale). */
export function getReminderDate(product: Product, options: ReminderOptions = DEFAULT_REMINDER_OPTIONS): Date {
  const date = parseLocalDate(addDays(product.expiresAt, -options.daysBefore));
  date.setHours(options.hour, 0, 0, 0);
  return date;
}

const whenLabel = (daysBefore: number) => (daysBefore === 1 ? 'demain' : `dans ${daysBefore} jours`);

export function reminderTitle(name: string, daysBefore: number): string {
  return `${name} périme ${whenLabel(daysBefore)} !`;
}

/** « Lait », « Lait et Yaourts », « Lait, Yaourts, Crème et 2 autres ». */
function listNames(names: readonly string[], max = 3): string {
  if (names.length <= max) {
    return names.length === 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`;
  }
  const rest = names.length - max;
  return `${names.slice(0, max).join(', ')} et ${rest} autre${rest > 1 ? 's' : ''}`;
}

/**
 * Un rappel par jour (et non par produit) : quatre produits qui périment le même jour
 * donnent une seule notification qui les cite tous.
 */
export function planReminders(
  products: readonly Product[],
  options: ReminderOptions = DEFAULT_REMINDER_OPTIONS,
  now: Date = new Date(),
): ReminderPlan[] {
  if (!options.enabled) return [];
  const byDay = new Map<string, Product[]>();
  for (const product of products) {
    if (product.status !== 'active') continue;
    const day = addDays(product.expiresAt, -options.daysBefore);
    byDay.set(day, [...(byDay.get(day) ?? []), product]);
  }

  return [...byDay.entries()]
    .map(([day, group]): ReminderPlan => {
      const triggerAt = getReminderDate(group[0] as Product, options);
      const sorted = [...group].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      const single = sorted.length === 1 ? sorted[0] : undefined;
      return {
        identifier: `${IDENTIFIER_PREFIX}day-${day}`,
        productId: single?.id,
        productIds: sorted.map((p) => p.id),
        triggerAt,
        title: single
          ? reminderTitle(single.name, options.daysBefore)
          : `${sorted.length} produits périment ${whenLabel(options.daysBefore)}`,
        body: single
          ? 'Pensez à le cuisiner ou à le congeler pour éviter le gaspillage.'
          : `${listNames(sorted.map((p) => p.name))} : pensez à les cuisiner ou à les congeler.`,
      };
    })
    // Produits déjà périmés ou rappel trop proche : rien à planifier, le bandeau de l’app prend le relais.
    .filter((plan) => plan.triggerAt.getTime() - now.getTime() >= MIN_LEAD_MS)
    .sort((a, b) => a.triggerAt.getTime() - b.triggerAt.getTime())
    .slice(0, MAX_SCHEDULED);
}

const signatureOf = (triggerAt: number, title: string, body: string) => `${triggerAt}|${title}|${body}`;

function scheduledSignature(request: Notifications.NotificationRequest): string | null {
  const data = request.content.data as { triggerAt?: unknown } | undefined;
  const triggerAt = typeof data?.triggerAt === 'number' ? data.triggerAt : null;
  return triggerAt === null ? null : signatureOf(triggerAt, request.content.title ?? '', request.content.body ?? '');
}

/**
 * Aligne les notifications planifiées sur les produits actifs.
 * À appeler après chaque mutation et au démarrage.
 */
export async function syncExpiryReminders(
  products: readonly Product[],
  options: ReminderOptions = DEFAULT_REMINDER_OPTIONS,
): Promise<void> {
  if ((await getPermissionState()) !== 'granted') return;

  const plans = planReminders(products, options);
  const wanted = new Map(plans.map((plan) => [plan.identifier, plan]));
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const upToDate = new Set<string>();

  for (const request of scheduled) {
    if (!request.identifier.startsWith(IDENTIFIER_PREFIX)) continue;
    const plan = wanted.get(request.identifier);
    const isCurrent =
      plan !== undefined &&
      scheduledSignature(request) === signatureOf(plan.triggerAt.getTime(), plan.title, plan.body);

    if (isCurrent) upToDate.add(request.identifier);
    else await Notifications.cancelScheduledNotificationAsync(request.identifier).catch(() => undefined);
  }

  // Chaque rappel est programmé indépendamment : un échec isolé n’empêche pas les autres.
  // Les rappels manquants seront retentés à la prochaine synchronisation.
  let failures = 0;
  for (const plan of plans) {
    if (upToDate.has(plan.identifier)) continue;
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: plan.identifier,
        content: {
          title: plan.title,
          body: plan.body,
          sound: true,
          data: { ...(plan.productId ? { productId: plan.productId } : {}), triggerAt: plan.triggerAt.getTime() },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: plan.triggerAt,
          channelId: CHANNEL_ID,
        },
      });
    } catch {
      failures += 1;
    }
  }
  if (failures > 0) {
    throw new Error(`${failures} rappel(s) n’ont pas pu être programmés ; nouvel essai à la prochaine synchronisation.`);
  }
}

/** Nombre de rappels SmartFridge actuellement programmés (un par jour concerné, affiché dans les réglages). */
export async function countScheduledReminders(): Promise<number> {
  if (UNSUPPORTED) return 0;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.filter((request) => request.identifier.startsWith(IDENTIFIER_PREFIX)).length;
}
