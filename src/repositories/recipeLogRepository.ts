import type { SQLiteDatabase } from 'expo-sqlite';

import type { CookedEntry } from '@/types/recipeLog';
import { createId } from '@/utils/id';
import { inTransaction } from '@/storage/transaction';

interface HistoryRow {
  id: string;
  recipe_id: string;
  cooked_at: string;
  saved_count: number;
}

/** Favoris et historique des recettes, stockés localement. */
export function createRecipeLogRepository(db: SQLiteDatabase) {
  return {
    async getFavorites(): Promise<string[]> {
      const rows = await db.getAllAsync<{ recipe_id: string }>('SELECT recipe_id FROM recipe_favorites ORDER BY added_at DESC');
      return rows.map((row) => row.recipe_id);
    },

    async setFavorite(recipeId: string, favorite: boolean): Promise<void> {
      if (favorite) {
        await db.runAsync(
          'INSERT OR IGNORE INTO recipe_favorites (recipe_id, added_at) VALUES (?, ?)',
          recipeId,
          new Date().toISOString(),
        );
      } else {
        await db.runAsync('DELETE FROM recipe_favorites WHERE recipe_id = ?', recipeId);
      }
    },

    async getHistory(): Promise<CookedEntry[]> {
      const rows = await db.getAllAsync<HistoryRow>('SELECT * FROM recipe_history ORDER BY cooked_at DESC');
      return rows.map((row) => ({ id: row.id, recipeId: row.recipe_id, cookedAt: row.cooked_at, savedCount: row.saved_count }));
    },

    async logCooked(recipeId: string, savedCount: number): Promise<CookedEntry> {
      const entry: CookedEntry = { id: createId(), recipeId, cookedAt: new Date().toISOString(), savedCount };
      await db.runAsync(
        'INSERT INTO recipe_history (id, recipe_id, cooked_at, saved_count) VALUES (?, ?, ?, ?)',
        entry.id,
        entry.recipeId,
        entry.cookedAt,
        entry.savedCount,
      );
      return entry;
    },

    async removeEntry(id: string): Promise<void> {
      await db.runAsync('DELETE FROM recipe_history WHERE id = ?', id);
    },

    async restore(favorites: readonly string[], history: readonly CookedEntry[], mode: 'replace' | 'merge'): Promise<void> {
      await inTransaction(db, async (txn) => {
        if (mode === 'replace') {
          await txn.runAsync('DELETE FROM recipe_favorites');
          await txn.runAsync('DELETE FROM recipe_history');
        }
        const now = new Date().toISOString();
        for (const recipeId of favorites) {
          await txn.runAsync('INSERT OR IGNORE INTO recipe_favorites (recipe_id, added_at) VALUES (?, ?)', recipeId, now);
        }
        for (const entry of history) {
          await txn.runAsync(
            'INSERT OR IGNORE INTO recipe_history (id, recipe_id, cooked_at, saved_count) VALUES (?, ?, ?, ?)',
            entry.id,
            entry.recipeId,
            entry.cookedAt,
            entry.savedCount,
          );
        }
      });
    },

    async clearAll(): Promise<void> {
      await db.runAsync('DELETE FROM recipe_favorites');
      await db.runAsync('DELETE FROM recipe_history');
    },
  };
}
