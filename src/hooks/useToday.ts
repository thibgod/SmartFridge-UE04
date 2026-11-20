import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { todayLocalDate } from '@/utils/date';

/**
 * Date du jour (YYYY-MM-DD), mise à jour au retour au premier plan.
 * Permet de rafraîchir badges et compteurs si l’app est rouverte le lendemain.
 */
export function useToday(): string {
  const [today, setToday] = useState(todayLocalDate);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(todayLocalDate());
    });
    return () => subscription.remove();
  }, []);

  return today;
}
