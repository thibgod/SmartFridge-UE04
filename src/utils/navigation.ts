import { router } from 'expo-router';

/**
 * Ferme l’écran courant. Un écran ouvert par lien direct (notification, widget, adresse web
 * sur l’écran du frigo) n’a pas d’écran précédent : on revient alors à l’accueil.
 */
export function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
