import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { countScheduledReminders, getPermissionState, type PermissionState } from '@/services/notifications';

interface NotificationStatus {
  permission: PermissionState | null;
  scheduledCount: number | null;
  refresh: () => void;
}

/**
 * État des notifications pour l’écran Réglages, relu à l’affichage, après chaque
 * reprogrammation et au retour dans l’app (l’autorisation a pu changer dans les réglages du téléphone).
 */
export function useNotificationStatus(remindersVersion: number): NotificationStatus {
  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [scheduledCount, setScheduledCount] = useState<number | null>(null);

  const refresh = useCallback(() => {
    getPermissionState()
      .then(setPermission)
      .catch(() => setPermission('denied'));
    countScheduledReminders()
      .then(setScheduledCount)
      .catch(() => setScheduledCount(null));
  }, []);

  // Lecture à l’affichage, puis après chaque reprogrammation des rappels.
  useEffect(refresh, [refresh, remindersVersion]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  return { permission, scheduledCount, refresh };
}
