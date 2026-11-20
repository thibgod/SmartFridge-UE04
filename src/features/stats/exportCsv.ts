import { CATEGORIES, LOCATIONS } from '@/constants/catalog';
import type { Product } from '@/types/product';
import { closedAmounts } from '@/utils/stats';

/** Repère UTF-8 : sans lui, Excel affiche « CrÃ¨me » au lieu de « Crème ». */
export const CSV_BOM = '﻿';

const HEADERS = ['Produit', 'Catégorie', 'Emplacement', 'Statut', 'Date', 'Péremption', 'Prix (€)', 'Gaspillé (€)'];

/**
 * Cellule sûre : entre guillemets si elle contient un séparateur, et désarmée si elle commence
 * comme une formule (« =», « +», « -», « @ ») qu’un tableur exécuterait à l’ouverture.
 */
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[;"\n\r]/.test(safe) || safe !== value ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const euros = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

function frenchDate(iso: string): string {
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/**
 * Historique des produits consommés ou jetés, du plus récent au plus ancien, au format CSV
 * français (séparateur « ; », virgule décimale), prêt à ouvrir dans Excel, Numbers ou Sheets.
 */
export function buildHistoryCsv(products: readonly Product[]): string {
  const closed = products
    .filter((p) => p.status !== 'active' && p.closedAt)
    .sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? ''));

  const rows = closed.map((product) => {
    const { lostCents } = closedAmounts(product);
    const hasPrice = typeof product.price === 'number';
    return [
      cell(product.name),
      cell(CATEGORIES[product.category].label),
      cell(LOCATIONS[product.location].shortLabel),
      product.status === 'consumed' ? 'Consommé' : 'Jeté',
      frenchDate(product.closedAt ?? ''),
      frenchDate(product.expiresAt),
      hasPrice ? euros(Math.round((product.price ?? 0) * 100)) : '',
      hasPrice ? euros(lostCents) : '',
    ].join(';');
  });

  return CSV_BOM + [HEADERS.join(';'), ...rows].join('\r\n');
}
