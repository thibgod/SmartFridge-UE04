import { File, Paths } from 'expo-file-system';

import { parseWidgetSnapshot, type WidgetSnapshot } from '@/features/widget/widgetData';

/** Copie privée de l’app, relue par la tâche du widget ; elle ne quitte pas le téléphone. */
const snapshotFile = () => new File(Paths.document, 'widget-android.json');

export function writeWidgetSnapshot(snapshot: WidgetSnapshot): void {
  const file = snapshotFile();
  if (!file.exists) file.create();
  file.write(JSON.stringify(snapshot));
}

export async function readWidgetSnapshot(): Promise<WidgetSnapshot | null> {
  const file = snapshotFile();
  if (!file.exists) return null;
  return parseWidgetSnapshot(await file.text());
}
