import { useCallback } from 'react';
import { Alert } from 'react-native';

import { useToast } from '@/features/feedback/ToastProvider';
import { emitMascotMood, moodForClosedStatus } from '@/features/mascot/mascot';
import type { ClosedProductStatus, Product } from '@/types/product';
import { daysUntil } from '@/utils/date';
import { haptics } from '@/utils/haptics';

import { useProducts } from './ProductsProvider';

/** Actions utilisateur avec retour visuel (toast, annulation, confirmation). */
export function useProductActions() {
  const { closeProduct, reopenProduct, deleteProduct } = useProducts();
  const { showToast } = useToast();

  const close = useCallback(
    async (product: Product, status: ClosedProductStatus) => {
      // Retour haptique au moment du toucher, sur la même image que l’animation de la ligne.
      if (status === 'consumed') haptics.success();
      else haptics.light();
      try {
        await closeProduct(product.id, status);
        const undo = () => {
          reopenProduct(product.id).catch(() => showToast({ tone: 'error', message: 'Impossible d’annuler cette action.' }));
        };
        // La mascotte réagit dans sa bulle, avec « Annuler » ; le message en bas ne sert que si elle n’est pas à l’écran.
        const shownByMascot = emitMascotMood(moodForClosedStatus(status), {
          name: product.name,
          daysLeft: daysUntil(product.expiresAt),
          undo,
        });
        if (shownByMascot) return;
        showToast({
          tone: 'success',
          message:
            status === 'consumed'
              ? `Bravo ! « ${product.name} » a été consommé.`
              : `« ${product.name} » a été marqué comme jeté.`,
          actionLabel: 'Annuler',
          onAction: undo,
        });
      } catch {
        showToast({ tone: 'error', message: 'L’action n’a pas pu être enregistrée. Réessayez.' });
      }
    },
    [closeProduct, reopenProduct, showToast],
  );

  /**
   * Demande confirmation puis supprime. `onConfirmed` s’exécute juste avant la suppression
   * (ex. fermer l’écran d’édition). Résout `true` si le produit a été supprimé.
   */
  const confirmDelete = useCallback(
    (product: Product, onConfirmed?: () => void) =>
      new Promise<boolean>((resolve) => {
        Alert.alert(
          'Supprimer ce produit ?',
          `« ${product.name} » sera retiré sans être compté dans les statistiques. Pour suivre votre gaspillage, préférez « Consommé » ou « Jeté ».`,
          [
            { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
            {
              text: 'Supprimer',
              style: 'destructive',
              onPress: () => {
                onConfirmed?.();
                deleteProduct(product.id)
                  .then(() => {
                    showToast({ tone: 'neutral', message: `« ${product.name} » a été supprimé.` });
                    resolve(true);
                  })
                  .catch(() => {
                    showToast({ tone: 'error', message: 'La suppression a échoué. Réessayez.' });
                    resolve(false);
                  });
              },
            },
          ],
          { cancelable: true, onDismiss: () => resolve(false) },
        );
      }),
    [deleteProduct, showToast],
  );

  return { close, confirmDelete };
}
