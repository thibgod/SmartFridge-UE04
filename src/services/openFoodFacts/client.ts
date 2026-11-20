import Constants from 'expo-constants';

import type { ProductCategory } from '@/types/product';

import { mapOffCategories } from './categoryMapping';

/**
 * Seul appel réseau de l’application. On n’envoie que le code-barres :
 * aucune donnée personnelle, aucun identifiant d’appareil.
 */
const API_BASE = 'https://world.openfoodfacts.org/api/v2/product';
const FIELDS = 'product_name,product_name_fr,brands,image_front_small_url,categories_tags,quantity';
const TIMEOUT_MS = 8000;

export interface OffProductData {
  barcode: string;
  name?: string;
  brand?: string;
  imageUrl?: string;
  category: ProductCategory;
  quantity?: string;
}

export type OffLookupResult =
  | { status: 'found'; product: OffProductData }
  | { status: 'not_found' }
  | { status: 'error'; reason: 'invalid_barcode' | 'timeout' | 'network' | 'bad_response' };

export function normalizeBarcode(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** EAN-8, UPC-A (12), EAN-13 et GTIN-14. */
export function isPlausibleBarcode(code: string): boolean {
  return /^\d{8}$|^\d{12,14}$/.test(code);
}

const cleanString = (value: unknown, maxLength = 120): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
};

const cleanImageUrl = (value: unknown): string | undefined => {
  const url = cleanString(value, 500);
  return url && /^https:\/\//.test(url) ? url : undefined;
};

/** « 400 g ℮ » ou « 400 g e » (symbole de quantité estimée) → « 400 g ». */
const cleanQuantity = (value: unknown): string | undefined =>
  cleanString(value, 40)
    ?.replace(/\s*℮\s*$/u, '')
    .replace(/(\d\s*(?:mg|g|kg|ml|cl|dl|l))\s+e$/i, '$1') || undefined;

/** Première marque de la liste « Marque A, Marque B ». */
const firstBrand = (value: unknown): string | undefined => cleanString(value)?.split(',')[0]?.trim() || undefined;

export function parseOffPayload(barcode: string, payload: unknown): OffProductData | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const { status, product } = payload as { status?: unknown; product?: unknown };
  if (status !== 1 || typeof product !== 'object' || product === null) return null;

  const raw = product as Record<string, unknown>;
  const data: OffProductData = {
    barcode,
    name: cleanString(raw.product_name_fr) ?? cleanString(raw.product_name),
    brand: firstBrand(raw.brands),
    imageUrl: cleanImageUrl(raw.image_front_small_url),
    category: mapOffCategories(raw.categories_tags),
    quantity: cleanQuantity(raw.quantity),
  };
  // Une fiche sans nom ni image n’apporte rien : on la traite comme introuvable.
  return data.name || data.imageUrl ? data : null;
}

export async function fetchProductByBarcode(rawBarcode: string): Promise<OffLookupResult> {
  const barcode = normalizeBarcode(rawBarcode);
  if (!isPlausibleBarcode(barcode)) return { status: 'error', reason: 'invalid_barcode' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}/${barcode}?fields=${FIELDS}`, {
      headers: {
        Accept: 'application/json',
        // Open Food Facts demande un User-Agent identifiant l’application.
        'User-Agent': `SmartFridge/${Constants.expoConfig?.version ?? '1.0.0'} (application mobile)`,
      },
      signal: controller.signal,
    });

    if (response.status === 404) return { status: 'not_found' };
    if (!response.ok) return { status: 'error', reason: 'bad_response' };

    const payload: unknown = await response.json().catch(() => null);
    if (payload === null) return { status: 'error', reason: 'bad_response' };

    const product = parseOffPayload(barcode, payload);
    return product ? { status: 'found', product } : { status: 'not_found' };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return { status: 'error', reason: aborted ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timer);
  }
}

export function describeLookupError(reason: Extract<OffLookupResult, { status: 'error' }>['reason']): string {
  switch (reason) {
    case 'invalid_barcode':
      return 'Ce code-barres ne semble pas valide (8, 12, 13 ou 14 chiffres attendus).';
    case 'timeout':
      return 'La recherche a pris trop de temps. Vérifiez votre connexion ou complétez la fiche à la main.';
    case 'network':
      return 'Pas de connexion internet. Vous pouvez compléter la fiche à la main.';
    case 'bad_response':
      return 'Open Food Facts ne répond pas correctement pour le moment. Complétez la fiche à la main.';
  }
}
