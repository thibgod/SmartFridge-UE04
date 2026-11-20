import type { SQLiteDatabase } from 'expo-sqlite';

/** Un résultat négatif (aucune image pertinente) est retenté après ce délai. */
const NEGATIVE_TTL_MS = 30 * 86_400_000;

export interface CachedImage {
  url: string | null;
}

/** Cache local des illustrations trouvées en ligne (nom normalisé → URL ou « aucune »). */
export function createImageCacheRepository(db: SQLiteDatabase) {
  return {
    async get(key: string, now: number = Date.now()): Promise<CachedImage | null> {
      const row = await db.getFirstAsync<{ url: string | null; fetched_at: string }>(
        'SELECT url, fetched_at FROM image_cache WHERE key = ?',
        key,
      );
      if (!row) return null;
      if (row.url === null && now - Date.parse(row.fetched_at) > NEGATIVE_TTL_MS) return null;
      return { url: row.url };
    },

    async set(key: string, url: string | null): Promise<void> {
      await db.runAsync(
        `INSERT INTO image_cache (key, url, fetched_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET url = excluded.url, fetched_at = excluded.fetched_at`,
        key,
        url,
        new Date().toISOString(),
      );
    },

    async clear(): Promise<void> {
      await db.runAsync('DELETE FROM image_cache');
    },
  };
}

export type ImageCacheRepository = ReturnType<typeof createImageCacheRepository>;
