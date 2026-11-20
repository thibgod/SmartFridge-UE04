import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { savePhoto } from '@/services/photos';
import { pickPhoto, PhotoTextError } from '@/services/textRecognition';

/** Photo personnelle du produit : appareil photo ou galerie, recadrée et gardée sur le téléphone. */
export function useProductPhoto(onPhoto: (uri: string) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const take = useCallback(
    async (source: 'camera' | 'library') => {
      setError(null);
      try {
        const temp = await pickPhoto(source, { square: true, quality: 0.7 });
        if (!temp) return;
        setBusy(true);
        onPhoto(await savePhoto(temp));
      } catch (caught) {
        setError(caught instanceof PhotoTextError ? caught.message : 'La photo n’a pas pu être enregistrée.');
      } finally {
        setBusy(false);
      }
    },
    [onPhoto],
  );

  const choose = useCallback(() => {
    Alert.alert('Photo du produit', 'Elle reste sur votre téléphone.', [
      { text: 'Prendre une photo', onPress: () => void take('camera') },
      { text: 'Choisir dans mes photos', onPress: () => void take('library') },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }, [take]);

  return { choose, busy, error };
}
