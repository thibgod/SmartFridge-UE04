import type { SQLiteDatabase } from 'expo-sqlite';

import { CATEGORIES } from '@/constants/catalog';
import type { ProductCategory } from '@/types/product';
import type { ShoppingItem, ShoppingSource } from '@/types/shopping';
import { inTransaction } from '@/storage/transaction';

interface ShoppingRow {
  id: string;
  name: string;
  category: string;
  quantity: string;
  checked: number;
  source: string;
  added_at: string;
  checked_at: string | null;
}

const SOURCES: readonly ShoppingSource[] = ['manual', 'restock', 'recipe'];

function mapRow(row: ShoppingRow): ShoppingItem {
  return {
    id: row.id,
    name: row.name,
    category: row.category in CATEGORIES ? (row.category as ProductCategory) : 'autre',
    quantity: row.quantity,
    checked: row.checked === 1,
    source: SOURCES.includes(row.source as ShoppingSource) ? (row.source as ShoppingSource) : 'manual',
    addedAt: row.added_at,
    checkedAt: row.checked_at ?? undefined,
  };
}

type SqlExecutor = Pick<SQLiteDatabase, 'runAsync'>;

/** Liste de courses stockée localement. */
export function createShoppingRepository(db: SQLiteDatabase) {
  async function insert(item: ShoppingItem, executor: SqlExecutor = db): Promise<void> {
    await executor.runAsync(
      `INSERT INTO shopping_items (id, name, category, quantity, checked, source, added_at, checked_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      item.id,
      item.name,
      item.category,
      item.quantity,
      item.checked ? 1 : 0,
      item.source,
      item.addedAt,
      item.checkedAt ?? null,
    );
  }

  return {
    async getAll(): Promise<ShoppingItem[]> {
      const rows = await db.getAllAsync<ShoppingRow>('SELECT * FROM shopping_items ORDER BY added_at ASC');
      return rows.map(mapRow);
    },

    async insertMany(items: readonly ShoppingItem[]): Promise<void> {
      if (items.length === 0) return;
      await inTransaction(db, async (txn) => {
        for (const item of items) await insert(item, txn);
      });
    },

    async setChecked(id: string, checked: boolean): Promise<void> {
      await db.runAsync(
        'UPDATE shopping_items SET checked = ?, checked_at = ? WHERE id = ?',
        checked ? 1 : 0,
        checked ? new Date().toISOString() : null,
        id,
      );
    },

    async update(id: string, patch: Pick<ShoppingItem, 'name' | 'quantity' | 'category'>): Promise<void> {
      await db.runAsync(
        'UPDATE shopping_items SET name = ?, quantity = ?, category = ? WHERE id = ?',
        patch.name,
        patch.quantity,
        patch.category,
        id,
      );
    },

    async remove(id: string): Promise<void> {
      await db.runAsync('DELETE FROM shopping_items WHERE id = ?', id);
    },

    async removeMany(ids: readonly string[]): Promise<void> {
      if (ids.length === 0) return;
      await db.runAsync(`DELETE FROM shopping_items WHERE id IN (${ids.map(() => '?').join(', ')})`, ...ids);
    },

    async clearChecked(): Promise<void> {
      await db.runAsync('DELETE FROM shopping_items WHERE checked = 1');
    },

    async clearAll(): Promise<void> {
      await db.runAsync('DELETE FROM shopping_items');
    },

    /** Restauration d’une sauvegarde (mêmes règles que pour les produits). */
    async restore(items: readonly ShoppingItem[], mode: 'replace' | 'merge'): Promise<void> {
      await inTransaction(db, async (txn) => {
        if (mode === 'replace') await txn.runAsync('DELETE FROM shopping_items');
        for (const item of items) {
          const exists = await txn.getFirstAsync<{ id: string }>('SELECT id FROM shopping_items WHERE id = ?', item.id);
          if (!exists) await insert(item, txn);
        }
      });
    },
  };
}

export type ShoppingRepository = ReturnType<typeof createShoppingRepository>;
