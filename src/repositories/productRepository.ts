import type { SQLiteDatabase } from 'expo-sqlite';

import { CATEGORIES, LOCATIONS } from '@/constants/catalog';
import type {
  ClosedProductStatus,
  Product,
  ProductCategory,
  ProductInput,
  ProductLocation,
  ProductStatus,
} from '@/types/product';
import { MAIN_PLACE } from '@/features/places/places';
import { createId } from '@/utils/id';
import { isValidRemaining } from '@/utils/remaining';
import { inTransaction } from '@/storage/transaction';

interface ProductRow {
  id: string;
  name: string;
  category: string;
  quantity: string;
  expires_at: string;
  location: string;
  price: number | null;
  image_uri: string | null;
  barcode: string | null;
  brand: string | null;
  notes: string | null;
  source: string;
  status: string;
  added_at: string;
  updated_at: string;
  closed_at: string | null;
  opened_at: string | null;
  remaining: number | null;
  place_id: string | null;
}

const STATUSES: readonly ProductStatus[] = ['active', 'consumed', 'discarded'];

const asCategory = (value: string): ProductCategory => (value in CATEGORIES ? (value as ProductCategory) : 'autre');

const asLocation = (value: string): ProductLocation => (value in LOCATIONS ? (value as ProductLocation) : 'frigo');

const asStatus = (value: string): ProductStatus =>
  STATUSES.includes(value as ProductStatus) ? (value as ProductStatus) : 'active';

const orUndefined = <T>(value: T | null): T | undefined => (value === null ? undefined : value);

function mapRow(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    category: asCategory(row.category),
    quantity: row.quantity,
    expiresAt: row.expires_at,
    location: asLocation(row.location),
    price: orUndefined(row.price),
    imageUri: orUndefined(row.image_uri),
    barcode: orUndefined(row.barcode),
    brand: orUndefined(row.brand),
    notes: orUndefined(row.notes),
    source: row.source === 'open_food_facts' ? 'open_food_facts' : 'manual',
    status: asStatus(row.status),
    addedAt: row.added_at,
    updatedAt: row.updated_at,
    closedAt: orUndefined(row.closed_at),
    openedAt: orUndefined(row.opened_at),
    remaining: isValidRemaining(row.remaining) ? row.remaining : undefined,
    placeId: orUndefined(row.place_id),
  };
}

const nullable = <T>(value: T | undefined): T | null => (value === undefined ? null : value);

/** La maison est le lieu par défaut : elle s’enregistre comme NULL, comme les produits d’avant les lieux. */
const placeColumn = (placeId: string | undefined): string | null => (placeId && placeId !== MAIN_PLACE.id ? placeId : null);

/** Base ou transaction exclusive : les deux exposent runAsync. */
type SqlExecutor = Pick<SQLiteDatabase, 'runAsync'>;

/** Accès aux produits stockés localement. Aucune donnée ne quitte l’appareil. */
export function createProductRepository(db: SQLiteDatabase) {
  /** Insère un produit complet (création ou restauration d’une sauvegarde). */
  async function insert(product: Product, executor: SqlExecutor = db): Promise<void> {
    await executor.runAsync(
      `INSERT INTO products
        (id, name, category, quantity, expires_at, location, price, image_uri, barcode, brand, notes,
         source, status, added_at, updated_at, closed_at, opened_at, remaining, place_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      product.id,
      product.name,
      product.category,
      product.quantity,
      product.expiresAt,
      product.location,
      nullable(product.price),
      nullable(product.imageUri),
      nullable(product.barcode),
      nullable(product.brand),
      nullable(product.notes),
      product.source,
      product.status,
      product.addedAt,
      product.updatedAt,
      nullable(product.closedAt),
      nullable(product.openedAt),
      nullable(product.remaining),
      placeColumn(product.placeId),
    );
  }

  async function create(input: ProductInput): Promise<Product> {
    const now = new Date().toISOString();
    const product: Product = { ...input, id: createId(), status: 'active', addedAt: now, updatedAt: now };
    await insert(product);
    return product;
  }

  /** Ajout groupé (ticket de caisse) dans une seule transaction. */
  async function createMany(inputs: readonly ProductInput[]): Promise<Product[]> {
    const now = new Date().toISOString();
    const created = inputs.map((input): Product => ({
      ...input,
      id: createId(),
      status: 'active',
      addedAt: now,
      updatedAt: now,
    }));
    await inTransaction(db, async (txn) => {
      for (const product of created) await insert(product, txn);
    });
    return created;
  }

  return {
    create,
    createMany,

    async getAll(): Promise<Product[]> {
      const rows = await db.getAllAsync<ProductRow>('SELECT * FROM products ORDER BY expires_at ASC, name ASC');
      return rows.map(mapRow);
    },

    async getById(id: string): Promise<Product | null> {
      const row = await db.getFirstAsync<ProductRow>('SELECT * FROM products WHERE id = ?', id);
      return row ? mapRow(row) : null;
    },

    async update(id: string, input: ProductInput): Promise<void> {
      await db.runAsync(
        `UPDATE products SET
           name = ?, category = ?, quantity = ?, expires_at = ?, location = ?, price = ?,
           image_uri = ?, barcode = ?, brand = ?, notes = ?, source = ?, opened_at = ?, remaining = ?, place_id = ?,
           updated_at = ?
         WHERE id = ?`,
        input.name,
        input.category,
        input.quantity,
        input.expiresAt,
        input.location,
        nullable(input.price),
        nullable(input.imageUri),
        nullable(input.barcode),
        nullable(input.brand),
        nullable(input.notes),
        input.source,
        nullable(input.openedAt),
        isValidRemaining(input.remaining) ? input.remaining : null,
        placeColumn(input.placeId),
        new Date().toISOString(),
        id,
      );
    },

    async close(id: string, status: ClosedProductStatus): Promise<void> {
      const now = new Date().toISOString();
      await db.runAsync(
        `UPDATE products SET status = ?, closed_at = ?, updated_at = ? WHERE id = ? AND status = 'active'`,
        status,
        now,
        now,
        id,
      );
    },

    /** Annule une clôture (bouton « Annuler » après Consommé / Jeté). */
    async reopen(id: string): Promise<void> {
      await db.runAsync(
        `UPDATE products SET status = 'active', closed_at = NULL, updated_at = ? WHERE id = ?`,
        new Date().toISOString(),
        id,
      );
    },

    async remove(id: string): Promise<void> {
      await db.runAsync('DELETE FROM products WHERE id = ?', id);
    },

    /**
     * Restaure une sauvegarde. « replace » efface tout avant import ; « merge » ajoute
     * uniquement les produits dont l’identifiant n’existe pas encore. Retourne le nombre importé.
     */
    async restore(products: readonly Product[], mode: 'replace' | 'merge'): Promise<number> {
      let imported = 0;
      await inTransaction(db, async (txn) => {
        if (mode === 'replace') await txn.runAsync('DELETE FROM products');
        for (const product of products) {
          const exists = await txn.getFirstAsync<{ id: string }>('SELECT id FROM products WHERE id = ?', product.id);
          if (exists) continue;
          await insert(product, txn);
          imported += 1;
        }
      });
      return imported;
    },

    /** Clôture plusieurs produits d’un coup (ex. « J’ai cuisiné cette recette »). */
    async closeMany(ids: readonly string[], status: ClosedProductStatus): Promise<void> {
      const now = new Date().toISOString();
      await db.withTransactionAsync(async () => {
        for (const id of ids) {
          await db.runAsync(
            `UPDATE products SET status = ?, closed_at = ?, updated_at = ? WHERE id = ? AND status = 'active'`,
            status,
            now,
            now,
            id,
          );
        }
      });
    },

    /** Supprime les produits clôturés (remet les statistiques à zéro). */
    async clearHistory(): Promise<void> {
      await db.runAsync(`DELETE FROM products WHERE status != 'active'`);
    },

    async clearAll(): Promise<void> {
      await db.runAsync('DELETE FROM products');
    },
  };
}

export type ProductRepository = ReturnType<typeof createProductRepository>;
