import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { usePlaces } from '@/features/places/PlacesProvider';
import { usePremium } from '@/features/premium/PremiumProvider';
import { useProducts } from '@/features/products/ProductsProvider';
import { useRecipeLog } from '@/features/recipes/RecipeLogProvider';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useShopping } from '@/features/shopping/ShoppingProvider';
import { writeAutoBackup } from '@/services/backup/files';

import { isAutoBackupDue } from './autoBackup';

/**
 * Déclenche la sauvegarde automatique (Premium) une fois par jour : au lancement, puis à chaque
 * retour dans l’app. Ne rend rien ; un échec est silencieux et retenté au retour suivant.
 */
export function AutoBackupRunner() {
  const { isPremium } = usePremium();
  const { settings, updateSettings } = useSettings();
  const { products, isLoading } = useProducts();
  const { items: shoppingItems } = useShopping();
  const { favorites, history } = useRecipeLog();
  const { places } = usePlaces();
  const running = useRef(false);

  // Dernières données connues, lues au moment de la sauvegarde (pas de relance à chaque modification).
  const latest = useRef({ products, settings, shoppingItems, favorites, history, places });
  useEffect(() => {
    latest.current = { products, settings, shoppingItems, favorites, history, places };
  });

  const enabled = Platform.OS !== 'web' && isPremium && settings.autoBackup && !isLoading;

  useEffect(() => {
    if (!enabled) return;
    const run = async () => {
      const data = latest.current;
      const now = new Date();
      if (running.current || !isAutoBackupDue(data.settings.lastAutoBackupAt, now)) return;
      // Une app neuve, encore vide, n’écrase pas les copies d’une vraie sauvegarde.
      if (data.products.length === 0 && data.shoppingItems.length === 0) return;
      running.current = true;
      try {
        await writeAutoBackup(data.products, data.settings, {
          shoppingItems: data.shoppingItems,
          recipeFavorites: [...data.favorites],
          recipeHistory: data.history,
          places: data.places,
        });
        await updateSettings({ lastAutoBackupAt: now.toISOString() });
      } catch (error) {
        console.warn('[SmartFridge] Sauvegarde automatique impossible', error);
      } finally {
        running.current = false;
      }
    };
    void run();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void run();
    });
    return () => subscription.remove();
  }, [enabled, updateSettings]);

  return null;
}
