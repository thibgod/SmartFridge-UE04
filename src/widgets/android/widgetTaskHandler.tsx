import { requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';

import { propsFromSnapshot, type WidgetSnapshot } from '@/features/widget/widgetData';

import { DARK, ExpiringAndroidWidget, LIGHT } from './ExpiringAndroidWidget';
import { readWidgetSnapshot } from './snapshotFile';

const WIDGET_NAME = 'ExpiringWidget';

function representation(snapshot: WidgetSnapshot | null, height: number, now: Date) {
  const data = propsFromSnapshot(snapshot, now);
  return {
    light: <ExpiringAndroidWidget data={data} height={height} palette={LIGHT} />,
    dark: <ExpiringAndroidWidget data={data} height={height} palette={DARK} />,
  };
}

/** Appelée par Android, sans que l’app soit ouverte : ajout, mise à jour périodique, redimensionnement. */
export async function widgetTaskHandler({ widgetAction, widgetInfo, renderWidget }: WidgetTaskHandlerProps): Promise<void> {
  if (widgetAction !== 'WIDGET_ADDED' && widgetAction !== 'WIDGET_UPDATE' && widgetAction !== 'WIDGET_RESIZED') return;
  const snapshot = await readWidgetSnapshot().catch(() => null);
  renderWidget(representation(snapshot, widgetInfo.height, new Date()));
}

/** Redessine les widgets posés sur l’écran d’accueil dès que l’inventaire change dans l’app. */
export async function refreshExpiringWidget(snapshot: WidgetSnapshot, now: Date): Promise<void> {
  await requestWidgetUpdate({
    widgetName: WIDGET_NAME,
    renderWidget: (info) => representation(snapshot, info.height, now),
  });
}
