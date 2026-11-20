import * as Haptics from 'expo-haptics';

/** Retours haptiques discrets ; un échec (appareil sans moteur haptique) est ignoré. */
const safe = (run: () => Promise<void>) => {
  run().catch(() => undefined);
};

export const haptics = {
  select: () => safe(() => Haptics.selectionAsync()),
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  light: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
};
