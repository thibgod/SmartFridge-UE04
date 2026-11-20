import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

/** Ouvre la fiche du produit quand l’utilisateur touche un rappel de péremption. */
export function useNotificationNavigation() {
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!lastResponse) return;
    const data = lastResponse.notification.request.content.data as { productId?: unknown } | undefined;
    if (typeof data?.productId === 'string') {
      router.push({ pathname: '/product/[id]', params: { id: data.productId } });
    }
    void Notifications.clearLastNotificationResponseAsync();
  }, [lastResponse]);
}
