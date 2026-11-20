import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useToast } from '@/features/feedback/ToastProvider';
import { usePlaces } from '@/features/places/PlacesProvider';
import { useProducts } from '@/features/products/ProductsProvider';
import { useRecipeLog } from '@/features/recipes/RecipeLogProvider';
import { useShopping } from '@/features/shopping/ShoppingProvider';
import { exportBackup, pickBackup } from '@/services/backup/files';
import { BackupError, type ParsedBackup } from '@/services/backup/format';
import { formatIsoAsShortDate } from '@/utils/date';
import { haptics } from '@/utils/haptics';
import { pluralize } from '@/utils/text';

import { useSettings } from './SettingsProvider';

const errorMessage = (error: unknown, fallback: string) => (error instanceof BackupError ? error.message : fallback);

/** Sauvegarde, restauration et effacement des données, avec confirmations. */
export function useDataActions() {
  const { products, restoreProducts, clearHistory, clearAll } = useProducts();
  const { settings, updateSettings } = useSettings();
  const { items: shoppingItems, restoreItems, clearAll: clearShopping } = useShopping();
  const { favorites, history, restoreLog, clearLog } = useRecipeLog();
  const { places, restorePlaces, clearPlaces } = usePlaces();
  const { showToast } = useToast();
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);

  const exportData = useCallback(async () => {
    setBusy('export');
    try {
      await exportBackup(products, settings, { shoppingItems, recipeFavorites: [...favorites], recipeHistory: history, places });
    } catch (error) {
      showToast({ tone: 'error', message: errorMessage(error, 'L’export a échoué. Réessayez.') });
    } finally {
      setBusy(null);
    }
  }, [products, settings, shoppingItems, favorites, history, places, showToast]);

  const applyBackup = useCallback(
    async (backup: ParsedBackup, mode: 'replace' | 'merge') => {
      try {
        // Les lieux d’abord : les produits qui y sont rangés les retrouvent aussitôt.
        if (backup.places.length > 0 || mode === 'replace') await restorePlaces(backup.places, mode);
        const count = await restoreProducts(backup.products, mode);
        // Une ancienne sauvegarde sans liste de courses ne vide pas la liste actuelle.
        if (backup.shoppingItems.length > 0) await restoreItems(backup.shoppingItems, mode);
        if (backup.recipeFavorites.length + backup.recipeHistory.length > 0) {
          await restoreLog(backup.recipeFavorites, backup.recipeHistory, mode);
        }
        if (mode === 'replace' && backup.settings) await updateSettings(backup.settings);
        haptics.success();
        showToast({ tone: 'success', message: `${pluralize(count, 'produit importé', 'produits importés')}.` });
      } catch {
        showToast({ tone: 'error', message: 'La restauration a échoué. Vos données n’ont pas été modifiées.' });
      }
    },
    [restorePlaces, restoreProducts, restoreItems, restoreLog, updateSettings, showToast],
  );

  const importData = useCallback(async () => {
    setBusy('import');
    let backup: ParsedBackup | null = null;
    try {
      backup = await pickBackup();
    } catch (error) {
      showToast({ tone: 'error', message: errorMessage(error, 'Impossible de lire ce fichier.') });
    } finally {
      setBusy(null);
    }
    if (!backup) return;

    const parsed = backup;
    const origin = parsed.exportedAt ? ` du ${formatIsoAsShortDate(parsed.exportedAt)}` : '';
    const skipped =
      parsed.skipped > 0
        ? `\n${pluralize(parsed.skipped, 'entrée illisible sera ignorée', 'entrées illisibles seront ignorées')}.`
        : '';
    Alert.alert('Restaurer la sauvegarde ?', `Sauvegarde${origin} : ${pluralize(parsed.products.length, 'produit')}.${skipped}`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Ajouter à mes produits', onPress: () => void applyBackup(parsed, 'merge') },
      {
        text: 'Tout remplacer',
        style: 'destructive',
        onPress: () => void applyBackup(parsed, 'replace'),
      },
    ]);
  }, [applyBackup, showToast]);

  const confirmClearHistory = useCallback(() => {
    Alert.alert(
      'Effacer l’historique ?',
      'Les produits consommés et jetés seront supprimés et vos statistiques remises à zéro. Votre frigo n’est pas touché.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: () => {
            clearHistory()
              .then(() => showToast({ tone: 'neutral', message: 'Historique effacé.' }))
              .catch(() => showToast({ tone: 'error', message: 'L’effacement a échoué.' }));
          },
        },
      ],
    );
  }, [clearHistory, showToast]);

  const confirmClearAll = useCallback(() => {
    Alert.alert(
      'Tout effacer ?',
      'Tous vos produits, vos lieux, votre historique et votre liste de courses seront définitivement supprimés de cet appareil. Pensez à exporter une sauvegarde avant.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout effacer',
          style: 'destructive',
          onPress: () => {
            haptics.warning();
            Promise.all([clearAll(), clearShopping(), clearLog(), clearPlaces()])
              .then(() => showToast({ tone: 'neutral', message: 'Toutes les données ont été effacées.' }))
              .catch(() => showToast({ tone: 'error', message: 'L’effacement a échoué.' }));
          },
        },
      ],
    );
  }, [clearAll, clearShopping, clearLog, clearPlaces, showToast]);

  return { busy, exportData, importData, confirmClearHistory, confirmClearAll };
}
