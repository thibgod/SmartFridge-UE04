import { Platform } from 'react-native';

import { buildWidgetSnapshot, buildWidgetTimeline, LOCKED_WIDGET_PROPS } from '@/features/widget/widgetData';
import type { Product } from '@/types/product';

let lastSent = '';

/**
 * Met à jour le widget : la semaine d’affichage à venir sur iOS, une copie des données relue par
 * la tâche du widget sur Android. Sans effet dans Expo Go (module natif absent) ; n’écrit que si
 * le contenu a changé.
 */
export async function syncWidget(
  products: readonly Product[],
  threshold: number,
  isPremium: boolean,
  now: Date = new Date(),
): Promise<void> {
  if (Platform.OS === 'android') {
    await syncAndroidWidget(products, threshold, isPremium, now);
    return;
  }
  if (Platform.OS !== 'ios') return;
  // Le widget fait partie de Premium : sans abonnement, une seule entrée invite à le débloquer.
  const timeline = isPremium ? buildWidgetTimeline(products, now, threshold) : [{ date: now, props: LOCKED_WIDGET_PROPS }];
  // La date du jour fait partie de la clé : on renvoie la semaine au moins une fois par jour.
  const key = JSON.stringify([now.toDateString(), isPremium, timeline.map((entry) => entry.props)]);
  if (key === lastSent) return;
  try {
    const { default: widget } = await import('@/widgets/ExpiringWidget');
    widget.updateTimeline(timeline);
    lastSent = key;
  } catch (error) {
    console.warn('[SmartFridge] Widget indisponible', error);
  }
}

async function syncAndroidWidget(products: readonly Product[], threshold: number, isPremium: boolean, now: Date): Promise<void> {
  const snapshot = buildWidgetSnapshot(products, threshold, isPremium);
  const key = JSON.stringify([now.toDateString(), snapshot]);
  if (key === lastSent) return;
  try {
    const { writeWidgetSnapshot } = await import('@/widgets/android/snapshotFile');
    writeWidgetSnapshot(snapshot);
    const { refreshExpiringWidget } = await import('@/widgets/android/widgetTaskHandler');
    await refreshExpiringWidget(snapshot, now);
    lastSent = key;
  } catch (error) {
    console.warn('[SmartFridge] Widget indisponible', error);
  }
}
