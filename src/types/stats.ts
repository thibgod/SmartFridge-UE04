export interface WasteStats {
  consumedCount: number;
  discardedCount: number;
  closedCount: number;
  /** Part des produits jetés parmi les produits clôturés (0 à 1), null sans historique. */
  wasteRate: number | null;
  /** Montants en centimes pour éviter les erreurs d’arrondi. Valeur mangée (pas une économie en soi). */
  eatenCents: number;
  lostCents: number;
  /** Valeur des produits clôturés au prix connu (mangé + jeté). */
  trackedCents: number;
  /** Part jetée en valeur (0 à 1), null sans produit au prix connu. */
  wasteShare: number | null;
  /** Économie estimée par rapport à un foyer moyen (voir AVERAGE_WASTE_SHARE). */
  avoidedCents: number;
  /** Produits consommés de justesse (au plus « seuil urgent » jours avant la date, ou après). */
  rescuedCount: number;
  rescuedCents: number;
  /** Produits clôturés sans prix renseigné (exclus des montants). */
  unpricedCount: number;
}

export interface AverageComparison {
  /** Part jetée par l’utilisateur, en valeur (0 à 1). */
  share: number;
  /** Part jetée par un foyer moyen (0 à 1). */
  averageShare: number;
  avoidedCents: number;
  verdict: 'better' | 'similar' | 'worse';
}
