import type { LocalDateString } from '@/types/product';
import { DEFAULT_SETTINGS } from '@/types/settings';

import { daysUntil } from './date';

export type ExpiryLevel = 'expired' | 'urgent' | 'ok';

export interface ExpiryInfo {
  days: number;
  level: ExpiryLevel;
  label: string;
}

/** Seuil par défaut ; l’utilisateur peut le modifier dans les réglages. */
export const DEFAULT_URGENT_THRESHOLD = DEFAULT_SETTINGS.urgentThresholdDays;

export function getExpiryLevel(days: number, threshold: number = DEFAULT_URGENT_THRESHOLD): ExpiryLevel {
  if (days < 0) return 'expired';
  if (days <= threshold) return 'urgent';
  return 'ok';
}

export function getExpiryLabel(days: number): string {
  if (days < 0) {
    const elapsed = -days;
    return `Périmé depuis ${elapsed} jour${elapsed > 1 ? 's' : ''}`;
  }
  if (days === 0) return 'Périme aujourd’hui';
  if (days === 1) return 'Périme demain';
  return `Périme dans ${days} jours`;
}

export function getExpiryInfo(
  expiresAt: LocalDateString,
  now: Date = new Date(),
  threshold: number = DEFAULT_URGENT_THRESHOLD,
): ExpiryInfo {
  const days = daysUntil(expiresAt, now);
  return { days, level: getExpiryLevel(days, threshold), label: getExpiryLabel(days) };
}

/** Libellé court pour les espaces étroits (cartes du carrousel). */
export function getShortExpiryLabel(days: number): string {
  if (days < 0) return `Périmé (${-days} j)`;
  if (days === 0) return 'Aujourd’hui';
  if (days === 1) return 'Demain';
  return `Dans ${days} jours`;
}

/** Libellé très court de la pastille des lignes du frigo : « Auj. », « 3 j », « 2 sem. », « Périmé ». */
export function getCompactExpiryLabel(days: number): string {
  if (days < 0) return 'Périmé';
  if (days === 0) return 'Auj.';
  if (days === 1) return 'Demain';
  if (days < 14) return `${days} j`;
  if (days < 60) return `${Math.round(days / 7)} sem.`;
  return `${Math.round(days / 30)} mois`;
}
