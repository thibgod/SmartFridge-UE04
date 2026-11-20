import { CATEGORIES, LOCATIONS } from '@/constants/catalog';
import { sanitizeSettings } from '@/repositories/settingsRepository';
import type { Product, ProductCategory, ProductLocation, ProductStatus } from '@/types/product';
import { MAIN_PLACE, normalizePlaceName, PLACE_ICONS, PLACE_NAME_MAX_LENGTH, type Place } from '@/features/places/places';
import type { AppSettings } from '@/types/settings';
import type { CookedEntry } from '@/types/recipeLog';
import type { ShoppingItem } from '@/types/shopping';
import { isValidLocalDate } from '@/utils/date';
import { isLocalPhoto } from '@/utils/photo';
import { isValidPrice } from '@/utils/price';
import { isValidRemaining } from '@/utils/remaining';

/**
 * Format de sauvegarde local (fichier JSON que l’utilisateur garde où il veut).
 * Versionné pour rester lisible par les futures versions de l’app.
 */
export const BACKUP_FORMAT = 'smartfridge-backup';
/** v2 : liste de courses ; v3 : recettes favorites et historique ; v4 : lieux. Les anciennes versions restent lisibles. */
export const BACKUP_VERSION = 4;

/**
 * Restent propres à chaque téléphone : l’état d’interface (présentation vue, astuce comprise) et tout
 * ce qui touche à Premium (un fichier importé ne doit ni accorder l’abonnement ni remettre à zéro les quotas).
 */
type LocalOnlyKey =
  | 'onboardingDone'
  | 'swipeHintSeen'
  | 'receiptUsage'
  | 'premiumCached'
  | 'lastAutoBackupAt'
  | 'currentPlaceId'
  | 'seenBadges';
type BackupSettings = Omit<AppSettings, LocalOnlyKey>;

function withoutLocalOnly(settings: AppSettings): BackupSettings {
  const {
    onboardingDone: _a,
    swipeHintSeen: _b,
    receiptUsage: _c,
    premiumCached: _d,
    lastAutoBackupAt: _e,
    currentPlaceId: _f,
    seenBadges: _g,
    ...rest
  } = settings;
  return rest;
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: string;
  products: Product[];
  settings: BackupSettings;
  shoppingItems: ShoppingItem[];
  recipeFavorites: string[];
  recipeHistory: CookedEntry[];
  places: Place[];
}

/** Données facultatives d’une sauvegarde, au-delà des produits et réglages. */
export interface BackupExtras {
  shoppingItems?: readonly ShoppingItem[];
  recipeFavorites?: readonly string[];
  recipeHistory?: readonly CookedEntry[];
  places?: readonly Place[];
}

export interface ParsedBackup {
  products: Product[];
  settings: BackupSettings | null;
  shoppingItems: ShoppingItem[];
  recipeFavorites: string[];
  recipeHistory: CookedEntry[];
  places: Place[];
  /** Entrées illisibles ignorées. */
  skipped: number;
  exportedAt: string | null;
}

export class BackupError extends Error {}

export function buildBackup(
  products: readonly Product[],
  settings: AppSettings,
  now: Date = new Date(),
  extras: BackupExtras = {},
): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    // Les photos personnelles restent sur le téléphone : la sauvegarde n’en garde pas la trace.
    products: products.map((p) => (isLocalPhoto(p.imageUri) ? { ...p, imageUri: undefined } : p)),
    settings: withoutLocalOnly(settings),
    shoppingItems: [...(extras.shoppingItems ?? [])],
    recipeFavorites: [...(extras.recipeFavorites ?? [])],
    recipeHistory: [...(extras.recipeHistory ?? [])],
    places: [...(extras.places ?? [])],
  };
}

const STATUSES: readonly ProductStatus[] = ['active', 'consumed', 'discarded'];

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const optionalString = (value: unknown): string | undefined => (isNonEmptyString(value) ? value : undefined);
const isIsoDate = (value: unknown): value is string => isNonEmptyString(value) && !Number.isNaN(Date.parse(value));

function parseProduct(raw: unknown): Product | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const p = raw as Record<string, unknown>;
  if (!isNonEmptyString(p.id) || !isNonEmptyString(p.name)) return null;
  if (typeof p.expiresAt !== 'string' || !isValidLocalDate(p.expiresAt)) return null;
  if (!isIsoDate(p.addedAt)) return null;

  const status = STATUSES.includes(p.status as ProductStatus) ? (p.status as ProductStatus) : 'active';
  const closedAt = isIsoDate(p.closedAt) ? p.closedAt : undefined;

  return {
    id: p.id.slice(0, 64),
    name: p.name.trim().slice(0, 80),
    category: typeof p.category === 'string' && p.category in CATEGORIES ? (p.category as ProductCategory) : 'autre',
    quantity: typeof p.quantity === 'string' ? p.quantity.slice(0, 40) : '1',
    expiresAt: p.expiresAt,
    location: typeof p.location === 'string' && p.location in LOCATIONS ? (p.location as ProductLocation) : 'frigo',
    price: isValidPrice(p.price) ? p.price : undefined,
    imageUri: optionalString(p.imageUri),
    barcode: optionalString(p.barcode),
    brand: optionalString(p.brand),
    notes: optionalString(p.notes),
    source: p.source === 'open_food_facts' ? 'open_food_facts' : 'manual',
    status,
    addedAt: p.addedAt,
    updatedAt: isIsoDate(p.updatedAt) ? p.updatedAt : p.addedAt,
    // Un produit clôturé sans date de clôture reprend sa date de mise à jour.
    closedAt: status === 'active' ? undefined : (closedAt ?? (isIsoDate(p.updatedAt) ? p.updatedAt : p.addedAt)),
    openedAt: typeof p.openedAt === 'string' && isValidLocalDate(p.openedAt) ? p.openedAt : undefined,
    remaining: isValidRemaining(p.remaining) ? p.remaining : undefined,
    placeId: isNonEmptyString(p.placeId) && p.placeId !== MAIN_PLACE.id ? p.placeId.slice(0, 64) : undefined,
  };
}

function parseShoppingItem(raw: unknown): ShoppingItem | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const item = raw as Record<string, unknown>;
  if (!isNonEmptyString(item.id) || !isNonEmptyString(item.name) || !isIsoDate(item.addedAt)) return null;
  const checked = item.checked === true;
  return {
    id: item.id.slice(0, 64),
    name: item.name.trim().slice(0, 60),
    category: typeof item.category === 'string' && item.category in CATEGORIES ? (item.category as ProductCategory) : 'autre',
    quantity: typeof item.quantity === 'string' ? item.quantity.slice(0, 20) : '',
    checked,
    source: item.source === 'restock' || item.source === 'recipe' ? item.source : 'manual',
    addedAt: item.addedAt,
    checkedAt: checked && isIsoDate(item.checkedAt) ? item.checkedAt : undefined,
  };
}

export function parseBackup(text: string): ParsedBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('Ce fichier n’est pas une sauvegarde SmartFridge lisible.');
  }
  if (typeof data !== 'object' || data === null || (data as { format?: unknown }).format !== BACKUP_FORMAT) {
    throw new BackupError('Ce fichier n’est pas une sauvegarde SmartFridge.');
  }
  const backup = data as Partial<Record<keyof BackupFile, unknown>>;
  if (typeof backup.version !== 'number' || backup.version > BACKUP_VERSION) {
    throw new BackupError('Cette sauvegarde vient d’une version plus récente de SmartFridge. Mettez l’app à jour.');
  }
  if (!Array.isArray(backup.products)) {
    throw new BackupError('La sauvegarde ne contient aucun produit.');
  }

  const products: Product[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const raw of backup.products) {
    const product = parseProduct(raw);
    if (!product || seen.has(product.id)) {
      skipped += 1;
      continue;
    }
    seen.add(product.id);
    products.push(product);
  }

  let settings: BackupSettings | null = null;
  if (typeof backup.settings === 'object' && backup.settings !== null) {
    settings = withoutLocalOnly(sanitizeSettings(backup.settings as Record<string, unknown>));
  }

  const shoppingItems: ShoppingItem[] = [];
  const seenItems = new Set<string>();
  for (const raw of Array.isArray(backup.shoppingItems) ? backup.shoppingItems : []) {
    const item = parseShoppingItem(raw);
    if (!item || seenItems.has(item.id)) continue;
    seenItems.add(item.id);
    shoppingItems.push(item);
  }

  const recipeFavorites = Array.isArray(backup.recipeFavorites)
    ? [...new Set(backup.recipeFavorites.filter(isNonEmptyString).map((id) => id.slice(0, 64)))]
    : [];
  const recipeHistory: CookedEntry[] = [];
  for (const raw of Array.isArray(backup.recipeHistory) ? backup.recipeHistory : []) {
    if (typeof raw !== 'object' || raw === null) continue;
    const entry = raw as Record<string, unknown>;
    if (!isNonEmptyString(entry.id) || !isNonEmptyString(entry.recipeId) || !isIsoDate(entry.cookedAt)) continue;
    const savedCount = typeof entry.savedCount === 'number' && entry.savedCount >= 0 ? Math.floor(entry.savedCount) : 0;
    recipeHistory.push({
      id: entry.id.slice(0, 64),
      recipeId: entry.recipeId.slice(0, 64),
      cookedAt: entry.cookedAt,
      savedCount,
    });
  }

  const places: Place[] = [];
  for (const raw of Array.isArray(backup.places) ? backup.places : []) {
    if (typeof raw !== 'object' || raw === null) continue;
    const entry = raw as Record<string, unknown>;
    const name = typeof entry.name === 'string' ? normalizePlaceName(entry.name).slice(0, PLACE_NAME_MAX_LENGTH) : '';
    if (!isNonEmptyString(entry.id) || entry.id === MAIN_PLACE.id || !name || places.some((p) => p.id === entry.id)) continue;
    const icon = PLACE_ICONS.find((option) => option.icon === entry.icon)?.icon ?? 'home-outline';
    places.push({
      id: entry.id.slice(0, 64),
      name,
      icon,
      createdAt: isIsoDate(entry.createdAt) ? entry.createdAt : new Date(0).toISOString(),
    });
  }

  return {
    products,
    settings,
    shoppingItems,
    recipeFavorites,
    recipeHistory,
    places,
    skipped,
    exportedAt: isIsoDate(backup.exportedAt) ? backup.exportedAt : null,
  };
}
