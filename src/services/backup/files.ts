import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { AppSettings } from '@/types/settings';
import type { Product } from '@/types/product';
import { todayLocalDate } from '@/utils/date';

import { AUTO_BACKUP_DIRECTORY, autoBackupName, backupsToPrune } from '@/features/backup/autoBackup';
import * as Print from 'expo-print';

import { buildHistoryCsv } from '@/features/stats/exportCsv';
import { buildReportHtml } from '@/features/stats/reportHtml';

import { BackupError, buildBackup, parseBackup, type BackupExtras, type ParsedBackup } from './format';

/**
 * Export : écrit la sauvegarde dans le cache puis ouvre la feuille de partage système.
 * L’utilisateur choisit lui-même la destination (Fichiers, AirDrop, e-mail…) :
 * rien n’est envoyé automatiquement.
 */
export async function exportBackup(products: readonly Product[], settings: AppSettings, extras: BackupExtras): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new BackupError('Le partage de fichiers n’est pas disponible sur cet appareil.');
  }
  const file = new File(Paths.cache, `smartfridge-sauvegarde-${todayLocalDate()}.json`);
  file.create({ overwrite: true });
  file.write(JSON.stringify(buildBackup(products, settings, new Date(), extras), null, 2));

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Enregistrer la sauvegarde SmartFridge',
  });
}

/**
 * Sauvegarde automatique (Premium) : écrit la copie du jour dans Documents/Sauvegardes, visible dans
 * l’app Fichiers sur iPhone, puis supprime les copies automatiques au-delà des 7 plus récentes.
 */
export async function writeAutoBackup(
  products: readonly Product[],
  settings: AppSettings,
  extras: BackupExtras,
  now: Date = new Date(),
): Promise<void> {
  const directory = new Directory(Paths.document, AUTO_BACKUP_DIRECTORY);
  directory.create({ intermediates: true, idempotent: true });
  const file = new File(directory, autoBackupName(now));
  file.create({ overwrite: true });
  file.write(JSON.stringify(buildBackup(products, settings, now, extras), null, 2));

  const names = directory.list().map((entry) => entry.name);
  for (const name of backupsToPrune(names)) {
    try {
      new File(directory, name).delete();
    } catch {
      // Une ancienne copie impossible à supprimer n’empêche pas la sauvegarde du jour.
    }
  }
}

/** Export du Bilan (Premium) : tableau CSV de l’historique, partagé comme la sauvegarde. */
export async function exportHistoryCsv(products: readonly Product[]): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new BackupError('Le partage de fichiers n’est pas disponible sur cet appareil.');
  }
  const file = new File(Paths.cache, `smartfridge-bilan-${todayLocalDate()}.csv`);
  file.create({ overwrite: true });
  file.write(buildHistoryCsv(products));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'text/csv',
    UTI: 'public.comma-separated-values-text',
    dialogTitle: 'Exporter le Bilan SmartFridge',
  });
}

/** iOS ignore la marge CSS @page ; Android, lui, la respecte et ignore cette option. */
const REPORT_MARGINS = { top: 40, right: 40, bottom: 40, left: 40 };

/** Bilan en PDF (Premium) : généré sur le téléphone au format A4, puis partagé. */
export async function exportReportPdf(products: readonly Product[]): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new BackupError('Le partage de fichiers n’est pas disponible sur cet appareil.');
  }
  // A4 à 72 points par pouce : 595 × 842.
  const { uri } = await Print.printToFileAsync({
    html: buildReportHtml(products),
    width: 595,
    height: 842,
    margins: REPORT_MARGINS,
  });
  // Nom lisible plutôt que l’identifiant aléatoire du fichier temporaire.
  const file = new File(Paths.cache, `smartfridge-bilan-${todayLocalDate()}.pdf`);
  await new File(uri).move(file, { overwrite: true });
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: 'Bilan SmartFridge',
  });
}

/** Import : l’utilisateur choisit un fichier ; null s’il annule. */
export async function pickBackup(): Promise<ParsedBackup | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', 'public.json'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;

  const text = await new File(asset.uri).text();
  return parseBackup(text);
}
