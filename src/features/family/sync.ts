import { CATEGORIES, LOCATIONS } from '@/constants/catalog';
import type { Product, ProductStatus } from '@/types/product';

/**
 * Fusion des modifications d’un frigo partagé entre plusieurs téléphones.
 *
 * Chaque produit est un petit ensemble de « registres » indépendants, chacun avec son horodatage :
 * - `fields` : le contenu (nom, quantité, date…) ; changé par l’ajout et la modification ;
 * - `state` : actif / consommé / jeté ; changé par « Consommé », « Jeté » et « Annuler » ;
 * - `deleted` : suppression, définitive.
 * Pour chaque registre, la version la plus récente l’emporte. Ainsi « Consommé » sur un téléphone et
 * « quantité corrigée » sur un autre sont tous deux conservés, et l’ordre d’arrivée ne change rien :
 * tous les téléphones finissent avec le même frigo (fusion commutative, associative et idempotente).
 */

export interface Stamp {
  /** Moment de la modification sur le téléphone d’origine (ISO, UTC). */
  at: string;
  /** Départage deux modifications au même instant, de façon identique sur tous les téléphones. */
  deviceId: string;
}

/** Contenu partagé d’un produit. La photo reste sur le téléphone qui l’a prise (fichier local). */
export type ProductFields = Omit<Product, 'id' | 'status' | 'closedAt' | 'updatedAt' | 'imageUri'>;

export interface ProductState {
  status: ProductStatus;
  closedAt?: string;
}

interface Register<T> {
  stamp: Stamp;
  value: T;
}

/** Version connue d’un produit, ou modification à transmettre (mêmes champs, partiels). */
export interface ProductRecord {
  productId: string;
  fields?: Register<ProductFields>;
  state?: Register<ProductState>;
  deleted?: Stamp;
}

export function isNewer(a: Stamp, b: Stamp): boolean {
  if (a.at !== b.at) return a.at > b.at;
  return a.deviceId > b.deviceId;
}

function newest<T extends { stamp: Stamp }>(a: T | undefined, b: T | undefined): T | undefined {
  if (!a) return b;
  if (!b) return a;
  return isNewer(b.stamp, a.stamp) ? b : a;
}

function newestStamp(a: Stamp | undefined, b: Stamp | undefined): Stamp | undefined {
  if (!a) return b;
  if (!b) return a;
  return isNewer(b, a) ? b : a;
}

/** Fusionne deux versions du même produit. */
export function mergeRecord(current: ProductRecord | undefined, incoming: ProductRecord): ProductRecord {
  if (!current) return incoming;
  const merged: ProductRecord = { productId: current.productId };
  const fields = newest(current.fields, incoming.fields);
  const state = newest(current.state, incoming.state);
  const deleted = newestStamp(current.deleted, incoming.deleted);
  if (fields) merged.fields = fields;
  if (state) merged.state = state;
  if (deleted) merged.deleted = deleted;
  return merged;
}

/** Applique une liste de modifications à l’état connu (sans le modifier). */
export function applyChanges(
  records: ReadonlyMap<string, ProductRecord>,
  changes: readonly ProductRecord[],
): Map<string, ProductRecord> {
  const next = new Map(records);
  for (const change of changes) next.set(change.productId, mergeRecord(next.get(change.productId), change));
  return next;
}

/**
 * Produit tel qu’affiché, ou null s’il est supprimé ou encore incomplet (l’état est arrivé avant le
 * contenu : il s’affichera à la synchronisation suivante).
 */
export function toProduct(record: ProductRecord): Product | null {
  if (record.deleted || !record.fields || !record.state) return null;
  const updatedAt = isNewer(record.state.stamp, record.fields.stamp) ? record.state.stamp.at : record.fields.stamp.at;
  const product: Product = { ...record.fields.value, id: record.productId, status: record.state.value.status, updatedAt };
  if (record.state.value.closedAt) product.closedAt = record.state.value.closedAt;
  return product;
}

export function toProducts(records: ReadonlyMap<string, ProductRecord>): Product[] {
  const products: Product[] = [];
  for (const record of records.values()) {
    const product = toProduct(record);
    if (product) products.push(product);
  }
  return products.sort((a, b) => a.expiresAt.localeCompare(b.expiresAt) || a.name.localeCompare(b.name));
}

export function fieldsOf(product: Product): ProductFields {
  // La photo (fichier local) et les champs d’état ne font pas partie du contenu partagé.
  const { id: _id, status: _status, closedAt: _closedAt, updatedAt: _updatedAt, imageUri: _imageUri, ...fields } = product;
  return fields;
}

const STATUSES: readonly ProductStatus[] = ['active', 'consumed', 'discarded'];
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;

// `in` accepterait aussi « constructor » ou « toString » (hérités) : seules les vraies clés comptent.
const hasKey = (table: object, key: unknown) => typeof key === 'string' && Object.prototype.hasOwnProperty.call(table, key);

const isStamp = (value: unknown): value is Stamp => {
  const stamp = value as Stamp | undefined;
  return typeof stamp?.at === 'string' && ISO.test(stamp.at) && typeof stamp.deviceId === 'string' && stamp.deviceId !== '';
};

/**
 * Les modifications reçues viennent d’un autre téléphone, via le serveur : on ne leur fait pas
 * confiance. Une modification mal formée est ignorée plutôt que d’abîmer le frigo.
 */
export function isValidRecord(value: unknown): value is ProductRecord {
  const record = value as ProductRecord | undefined;
  if (typeof record?.productId !== 'string' || record.productId === '') return false;
  if (record.deleted !== undefined && !isStamp(record.deleted)) return false;
  if (record.state !== undefined) {
    if (!isStamp(record.state.stamp) || !STATUSES.includes(record.state.value?.status)) return false;
  }
  if (record.fields !== undefined) {
    const fields = record.fields.value;
    if (!isStamp(record.fields.stamp) || typeof fields !== 'object' || fields === null) return false;
    if (typeof fields.name !== 'string' || typeof fields.quantity !== 'string') return false;
    if (typeof fields.expiresAt !== 'string' || !LOCAL_DATE.test(fields.expiresAt)) return false;
    if (!hasKey(CATEGORIES, fields.category) || !hasKey(LOCATIONS, fields.location)) return false;
  }
  return record.fields !== undefined || record.state !== undefined || record.deleted !== undefined;
}
