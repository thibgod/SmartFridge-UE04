import type { SQLiteDatabase } from 'expo-sqlite';
import { Platform } from 'react-native';

/** Ce qu’une transaction expose : la base elle-même, ou sa connexion exclusive sur mobile. */
export type SqlExecutor = Pick<SQLiteDatabase, 'runAsync' | 'getFirstAsync' | 'getAllAsync' | 'execAsync'>;

/**
 * Transaction portable. Sur mobile, une transaction exclusive isole les écritures des autres
 * requêtes en cours ; sur le web (version « écran du frigo »), expo-sqlite ne propose que
 * la transaction simple, suffisante puisque l’app n’y a qu’une connexion.
 */
export async function inTransaction(db: SQLiteDatabase, task: (executor: SqlExecutor) => Promise<void>): Promise<void> {
  if (Platform.OS === 'web') {
    await db.withTransactionAsync(() => task(db));
    return;
  }
  await db.withExclusiveTransactionAsync((txn) => task(txn));
}
