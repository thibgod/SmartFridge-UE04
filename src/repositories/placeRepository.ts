import type { SQLiteDatabase } from 'expo-sqlite';

import { PLACE_ICONS, type Place } from '@/features/places/places';
import { inTransaction } from '@/storage/transaction';
import type { IconName } from '@/types/content';
import { createId } from '@/utils/id';

interface PlaceRow {
  id: string;
  name: string;
  icon: string;
  created_at: string;
}

const KNOWN_ICONS = new Set<string>(PLACE_ICONS.map((option) => option.icon));
const asIcon = (value: string): IconName => (KNOWN_ICONS.has(value) ? (value as IconName) : 'home-outline');

const mapRow = (row: PlaceRow): Place => ({ id: row.id, name: row.name, icon: asIcon(row.icon), createdAt: row.created_at });

/** Lieux supplémentaires (la maison est implicite et n’est pas stockée). */
export function createPlaceRepository(db: SQLiteDatabase) {
  return {
    async getAll(): Promise<Place[]> {
      const rows = await db.getAllAsync<PlaceRow>('SELECT * FROM places ORDER BY created_at ASC');
      return rows.map(mapRow);
    },

    async create(name: string, icon: IconName): Promise<Place> {
      const place: Place = { id: createId(), name, icon, createdAt: new Date().toISOString() };
      await db.runAsync(
        'INSERT INTO places (id, name, icon, created_at) VALUES (?, ?, ?, ?)',
        place.id,
        name,
        icon,
        place.createdAt,
      );
      return place;
    },

    async update(id: string, name: string, icon: IconName): Promise<void> {
      await db.runAsync('UPDATE places SET name = ?, icon = ? WHERE id = ?', name, icon, id);
    },

    /** Supprime le lieu ; ses produits (et leur historique) reviennent à la maison, rien n’est effacé. */
    async remove(id: string): Promise<void> {
      await inTransaction(db, async (txn) => {
        await txn.runAsync('UPDATE products SET place_id = NULL WHERE place_id = ?', id);
        await txn.runAsync('DELETE FROM places WHERE id = ?', id);
      });
    },

    /** Restauration d’une sauvegarde : ajoute les lieux absents, sans toucher aux existants. */
    async restore(places: readonly Place[], mode: 'replace' | 'merge'): Promise<void> {
      await inTransaction(db, async (txn) => {
        if (mode === 'replace') await txn.runAsync('DELETE FROM places');
        for (const place of places) {
          await txn.runAsync(
            'INSERT OR IGNORE INTO places (id, name, icon, created_at) VALUES (?, ?, ?, ?)',
            place.id,
            place.name,
            place.icon,
            place.createdAt,
          );
        }
      });
    },

    async clearAll(): Promise<void> {
      await db.runAsync('DELETE FROM places');
    },
  };
}
