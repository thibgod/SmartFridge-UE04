import { AUTO_BACKUP_KEEP, autoBackupName, backupsToPrune, isAutoBackupDue } from '@/features/backup/autoBackup';

describe('sauvegarde automatique (Premium)', () => {
  const now = new Date(2026, 9, 22, 9, 41);

  it('sauvegarde au plus une fois par jour calendaire', () => {
    expect(isAutoBackupDue(null, now)).toBe(true);
    expect(isAutoBackupDue(new Date(2026, 9, 22, 0, 5).toISOString(), now)).toBe(false);
    expect(isAutoBackupDue(new Date(2026, 9, 21, 23, 55).toISOString(), now)).toBe(true);
    expect(isAutoBackupDue('pas une date', now)).toBe(true);
  });

  it('nomme le fichier du jour et ne garde que les 7 plus récents', () => {
    expect(autoBackupName(now)).toBe('smartfridge-auto-2026-10-22.json');
    const names = Array.from({ length: 10 }, (_, i) => autoBackupName(new Date(2026, 9, 13 + i)));
    const pruned = backupsToPrune([...names, 'mes-notes.txt', 'smartfridge-sauvegarde-2026-10-01.json']);
    expect(AUTO_BACKUP_KEEP).toBe(7);
    expect(pruned).toEqual([
      'smartfridge-auto-2026-10-13.json',
      'smartfridge-auto-2026-10-14.json',
      'smartfridge-auto-2026-10-15.json',
    ]);
  });
});
