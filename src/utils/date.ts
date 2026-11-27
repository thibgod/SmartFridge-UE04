import type { LocalDateString } from '@/types/product';

/**
 * Les dates de péremption sont des dates calendaires (« le 14 octobre »), pas des instants.
 * On les stocke en YYYY-MM-DD et on calcule les écarts en jours via Date.UTC pour
 * neutraliser fuseaux horaires et changements d’heure.
 */

const MS_PER_DAY = 86_400_000;
const LOCAL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

const pad = (n: number) => String(n).padStart(2, '0');

export function toLocalDateString(date: Date): LocalDateString {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayLocalDate(now: Date = new Date()): LocalDateString {
  return toLocalDateString(now);
}

/** Vérifie le format ET l’existence de la date (refuse 2026-02-30). */
export function isValidLocalDate(value: string): value is LocalDateString {
  const match = LOCAL_DATE_RE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Convertit une date YYYY-MM-DD en objet Date à minuit heure locale. */
export function parseLocalDate(value: LocalDateString): Date {
  const match = LOCAL_DATE_RE.exec(value);
  if (!match) throw new Error(`Date invalide : ${value}`);
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  return new Date(y, m - 1, d);
}

function toUtcDayNumber(value: LocalDateString): number {
  const date = parseLocalDate(value);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY;
}

/** Nombre de jours calendaires de `from` à `to` (négatif si `to` est passé). */
export function daysBetween(from: LocalDateString, to: LocalDateString): number {
  return toUtcDayNumber(to) - toUtcDayNumber(from);
}

export function daysUntil(target: LocalDateString, now: Date = new Date()): number {
  return daysBetween(todayLocalDate(now), target);
}

export function addDays(value: LocalDateString, days: number): LocalDateString {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
}

export function addMonths(value: LocalDateString, months: number): LocalDateString {
  const date = parseLocalDate(value);
  const day = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + months);
  // Évite le débordement du 31 janvier vers le 3 mars.
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(day, lastDay));
  return toLocalDateString(date);
}

const longFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const shortFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** « mardi 14 octobre 2026 » */
export function formatLongDate(value: LocalDateString): string {
  return longFormatter.format(parseLocalDate(value));
}

/** « Mardi 14 octobre 2026 » (en début de phrase ou de champ). */
export function formatLongDateCapitalized(value: LocalDateString): string {
  const text = formatLongDate(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** « 14 oct. 2026 » */
export function formatShortDate(value: LocalDateString): string {
  return shortFormatter.format(parseLocalDate(value));
}

const dayMonthFormatter = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

/** « 21 nov. » : jour et mois, pour les dates proches (l’année est évidente). */
export function formatDayMonth(value: LocalDateString): string {
  return dayMonthFormatter.format(parseLocalDate(value));
}

/** Formate un horodatage ISO (date de clôture) en date courte locale. */
export function formatIsoAsShortDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : shortFormatter.format(date);
}

/** « 3 jours », « 2 semaines », « 4 mois », « 1 an » : durée lisible et arrondie. */
export function formatDuration(days: number): string {
  if (days >= 365 && days % 365 === 0) return days === 365 ? '1 an' : `${days / 365} ans`;
  if (days >= 60) return `${Math.round(days / 30)} mois`;
  if (days === 7) return '1 semaine';
  if (days >= 14 && days % 7 === 0) return `${days / 7} semaines`;
  return days === 1 ? '1 jour' : `${days} jours`;
}
