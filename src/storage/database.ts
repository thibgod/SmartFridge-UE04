import type { SQLiteDatabase } from 'expo-sqlite';
import { inTransaction } from './transaction';

export const DATABASE_NAME = 'smartfridge.db';

/**
 * Migrations successives, indexées par numéro de version (PRAGMA user_version).
 * Pour faire évoluer le schéma : ajouter une entrée, ne jamais modifier une migration publiée.
 */
const MIGRATIONS: readonly string[] = [
  // v1 — schéma initial
  `
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity TEXT NOT NULL DEFAULT '',
    expires_at TEXT NOT NULL,
    location TEXT NOT NULL,
    price REAL,
    image_uri TEXT,
    barcode TEXT,
    brand TEXT,
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    status TEXT NOT NULL DEFAULT 'active',
    added_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    closed_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_products_status_expires ON products (status, expires_at);
  CREATE INDEX IF NOT EXISTS idx_products_closed_at ON products (closed_at);
  `,
  // v2 — réglages (clé / valeur JSON)
  `
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  // v3 — date d’ouverture d’un produit + cache des illustrations trouvées en ligne
  `
  ALTER TABLE products ADD COLUMN opened_at TEXT;
  CREATE TABLE IF NOT EXISTS image_cache (
    key TEXT PRIMARY KEY NOT NULL,
    url TEXT,
    fetched_at TEXT NOT NULL
  );
  `,
  // v4 — l’analyse des noms a changé : on oublie les illustrations trouvées avec l’ancienne méthode
  `
  DELETE FROM image_cache;
  `,
  // v5 — liste de courses
  `
  CREATE TABLE IF NOT EXISTS shopping_items (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity TEXT NOT NULL DEFAULT '',
    checked INTEGER NOT NULL DEFAULT 0,
    source TEXT NOT NULL DEFAULT 'manual',
    added_at TEXT NOT NULL,
    checked_at TEXT
  );
  `,
  // v6 — recettes favorites et historique « J’ai cuisiné »
  `
  CREATE TABLE IF NOT EXISTS recipe_favorites (
    recipe_id TEXT PRIMARY KEY NOT NULL,
    added_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS recipe_history (
    id TEXT PRIMARY KEY NOT NULL,
    recipe_id TEXT NOT NULL,
    cooked_at TEXT NOT NULL,
    saved_count INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_recipe_history_recipe ON recipe_history (recipe_id, cooked_at);
  `,
  // v7 — part restante d’un produit entamé (null = entier)
  `
  ALTER TABLE products ADD COLUMN remaining REAL;
  `,
  // v8 — plusieurs frigos et lieux (Premium) ; place_id NULL = la maison
  `
  CREATE TABLE IF NOT EXISTS places (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  ALTER TABLE products ADD COLUMN place_id TEXT;
  CREATE INDEX IF NOT EXISTS idx_products_place ON products (place_id, status);
  `,
];

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;
  if (currentVersion >= MIGRATIONS.length) return;

  await inTransaction(db, async (txn) => {
    for (let version = currentVersion; version < MIGRATIONS.length; version += 1) {
      await txn.execAsync(MIGRATIONS[version] ?? '');
    }
    await txn.execAsync(`PRAGMA user_version = ${MIGRATIONS.length}`);
  });
}
