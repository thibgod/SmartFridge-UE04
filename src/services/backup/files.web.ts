import * as DocumentPicker from 'expo-document-picker';

import type { AppSettings } from '@/types/settings';
import type { Product } from '@/types/product';
import { todayLocalDate } from '@/utils/date';

import { buildHistoryCsv } from '@/features/stats/exportCsv';
import { buildReportHtml } from '@/features/stats/reportHtml';

import { BackupError, buildBackup, parseBackup, type BackupExtras, type ParsedBackup } from './format';

/**
 * Version web (écran du frigo, navigateur) : la sauvegarde est téléchargée comme un fichier,
 * et l’import lit le fichier choisi. C’est le moyen de passer ses produits du téléphone au frigo.
 */
export async function exportBackup(products: readonly Product[], settings: AppSettings, extras: BackupExtras): Promise<void> {
  const json = JSON.stringify(buildBackup(products, settings, new Date(), extras), null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `smartfridge-sauvegarde-${todayLocalDate()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function download(content: string, type: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Le navigateur n’a pas de dossier à remplir en silence : la sauvegarde automatique est propre au téléphone. */
export async function writeAutoBackup(): Promise<void> {}

export async function exportHistoryCsv(products: readonly Product[]): Promise<void> {
  download(buildHistoryCsv(products), 'text/csv;charset=utf-8', `smartfridge-bilan-${todayLocalDate()}.csv`);
}

/** Navigateur : le bilan s’ouvre dans un onglet, imprimable en PDF avec la fonction « Imprimer ». */
export async function exportReportPdf(products: readonly Product[]): Promise<void> {
  const url = URL.createObjectURL(new Blob([buildReportHtml(products)], { type: 'text/html;charset=utf-8' }));
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function pickBackup(): Promise<ParsedBackup | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'], multiple: false });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  const text = asset.file ? await asset.file.text() : await fetch(asset.uri).then((r) => r.text());
  if (!text) throw new BackupError('Impossible de lire ce fichier.');
  return parseBackup(text);
}
