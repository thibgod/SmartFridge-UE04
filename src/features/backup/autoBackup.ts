/**
 * Sauvegarde automatique (Premium) : une copie par jour de la sauvegarde habituelle, écrite dans
 * les Documents de l’app. Sur iPhone, ce dossier est visible dans l’app Fichiers (« Sur mon
 * iPhone › SmartFridge ») et inclus dans la sauvegarde iCloud du téléphone ; sur Android, la
 * sauvegarde Google de l’appareil reprend les données de l’app. Aucun serveur SmartFridge.
 */

export const AUTO_BACKUP_KEEP = 7;
export const AUTO_BACKUP_DIRECTORY = 'Sauvegardes';
const PREFIX = 'smartfridge-auto-';
const PATTERN = /^smartfridge-auto-(\d{4}-\d{2}-\d{2})\.json$/;

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Une copie par jour calendaire (heure locale) suffit : inutile d’écrire plus souvent. */
export function isAutoBackupDue(lastAt: string | null, now: Date): boolean {
  if (!lastAt) return true;
  const last = new Date(lastAt);
  if (Number.isNaN(last.getTime())) return true;
  return dayKey(last) !== dayKey(now);
}

export function autoBackupName(now: Date): string {
  return `${PREFIX}${dayKey(now)}.json`;
}

/** Copies automatiques à supprimer (les plus anciennes au-delà de 7) ; les autres fichiers ne sont jamais touchés. */
export function backupsToPrune(names: readonly string[]): string[] {
  const autos = names.filter((name) => PATTERN.test(name)).sort();
  return autos.slice(0, Math.max(0, autos.length - AUTO_BACKUP_KEEP));
}
