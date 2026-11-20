import { useCallback, useEffect, useState } from 'react';

import { isTextRecognitionAvailable, pickPhoto, PhotoTextError, recognizeText } from '@/services/textRecognition';
import type { LocalDateString } from '@/types/product';
import { todayLocalDate } from '@/utils/date';
import { haptics } from '@/utils/haptics';

import { findExpiryDate, type DateKind } from './expiryDateReader';

export type ExpiryScanState =
  | { status: 'idle' }
  | { status: 'reading' }
  | { status: 'found'; date: LocalDateString; kind: DateKind | null }
  | { status: 'error'; message: string };

/**
 * « Lire la date sur l’emballage » : photo, lecture du texte sur le téléphone,
 * puis la date trouvée est appliquée au formulaire.
 */
export function useExpiryDateScan(onDate: (date: LocalDateString) => void) {
  const [available, setAvailable] = useState(false);
  const [state, setState] = useState<ExpiryScanState>({ status: 'idle' });

  useEffect(() => {
    let active = true;
    isTextRecognitionAvailable().then((ok) => active && setAvailable(ok));
    return () => {
      active = false;
    };
  }, []);

  const scan = useCallback(async () => {
    try {
      const uri = await pickPhoto('camera');
      if (!uri) return;
      setState({ status: 'reading' });
      const found = findExpiryDate(await recognizeText(uri), todayLocalDate());
      if (!found) {
        setState({ status: 'error', message: 'Aucune date trouvée. Cadrez la date de près, bien éclairée, puis réessayez.' });
        return;
      }
      haptics.success();
      onDate(found.date);
      setState({ status: 'found', date: found.date, kind: found.kind });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof PhotoTextError ? error.message : 'La photo n’a pas pu être lue. Réessayez.',
      });
    }
  }, [onDate]);

  /** Une date choisie à la main efface le message de lecture. */
  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { available, state, scan, reset };
}
