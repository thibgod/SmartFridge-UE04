import { useDeferredValue, useMemo, useState } from 'react';

import { usePlaceProducts } from '@/features/places/usePlaceProducts';
import { useSettings } from '@/features/settings/SettingsProvider';
import type { LocationFilter, Product } from '@/types/product';
import { daysUntil, parseLocalDate } from '@/utils/date';
import { getExpiryInfo, getExpiryLevel, type ExpiryLevel } from '@/utils/expiry';
import { filterByUrgency, groupSections, selectInventory, sortByExpiry, type UrgencyFilter } from '@/utils/products';

import { useToday } from './useToday';

const MAX_PRIORITY = 8;

/** Phrase d’accroche de l’accueil : ce qu’il faut faire aujourd’hui, en une ligne. */
export function buildHeadline(
  counts: Record<ExpiryLevel, number>,
  priority: readonly Product[],
  total: number,
  now: Date,
): string {
  if (total === 0) return 'Ajoutez vos premiers produits pour suivre leurs dates.';
  const first = priority[0];
  if (counts.urgent === 1 && first) {
    return `« ${first.name} » ${getExpiryInfo(first.expiresAt, now).label.toLowerCase()}.`;
  }
  if (counts.urgent > 1) {
    const expired = counts.expired > 0 ? ` · ${counts.expired} à vérifier` : '';
    return `${counts.urgent} produits à consommer rapidement${expired}.`;
  }
  if (counts.expired > 0) {
    return `${counts.expired} produit${counts.expired > 1 ? 's' : ''} périmé${counts.expired > 1 ? 's' : ''} à vérifier.`;
  }
  return 'Rien ne presse : tout est sous contrôle.';
}

/** État de l’écran « Mon frigo » : recherche, filtres et données dérivées. */
export function useInventory() {
  // L’accueil montre le lieu choisi (Premium) ; sans lieu supplémentaire, c’est toute la maison.
  const activeProducts = usePlaceProducts();
  const threshold = useSettings().settings.urgentThresholdDays;
  const today = useToday();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LocationFilter>('all');
  const [urgency, setUrgency] = useState<UrgencyFilter>('all');
  const deferredQuery = useDeferredValue(query);

  // Tout ce qui dépend de la date est recalculé quand l’app est rouverte un autre jour.
  const derived = useMemo(() => {
    const now = parseLocalDate(today);
    const counts: Record<ExpiryLevel, number> = { expired: 0, urgent: 0, ok: 0 };
    const locationCounts: Record<LocationFilter, number> = { all: activeProducts.length, frigo: 0, congelateur: 0, placard: 0 };
    for (const product of activeProducts) {
      counts[getExpiryLevel(daysUntil(product.expiresAt, now), threshold)] += 1;
      locationCounts[product.location] += 1;
    }
    const priority = sortByExpiry(
      activeProducts.filter((p) => getExpiryLevel(daysUntil(p.expiresAt, now), threshold) === 'urgent'),
    ).slice(0, MAX_PRIORITY);
    const visible = filterByUrgency(selectInventory(activeProducts, filter, deferredQuery), urgency, now, threshold);

    return {
      counts,
      locationCounts,
      priority,
      headline: buildHeadline(counts, priority, activeProducts.length, now),
      // Lots du même produit au même endroit réunis sur une ligne.
      sections: groupSections(visible, now, threshold),
      visibleCount: visible.length,
    };
  }, [activeProducts, today, threshold, filter, deferredQuery, urgency]);

  return {
    ...derived,
    today,
    threshold,
    query,
    setQuery,
    filter,
    setFilter,
    urgency,
    setUrgency,
    isFiltered: filter !== 'all' || urgency !== 'all' || query.trim() !== '',
    totalCount: activeProducts.length,
    /** Produits actifs du lieu affiché (pour l’idée du soir, alignée sur ce qu’on voit). */
    placeProducts: activeProducts,
  };
}
