import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Marge haute des fiches ouvertes en modal. Sur iOS la feuille s’ouvre sous la barre d’état ;
 * sur Android l’écran est plein : il faut décaler les boutons posés sur la photo.
 */
export function useModalTopInset(): number {
  const { top } = useSafeAreaInsets();
  return Platform.OS === 'android' ? top : 0;
}
