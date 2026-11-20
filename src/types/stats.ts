export interface WasteStats {
  consumedCount: number;
  discardedCount: number;
  closedCount: number;
  /** Part des produits jetés parmi les produits clôturés (0 à 1), null sans historique. */
  wasteRate: number | null;
  /** Montants en centimes pour éviter les erreurs d’arrondi. */
  savedCents: number;
  lostCents: number;
  /** Produits clôturés sans prix renseigné (exclus des montants). */
  unpricedCount: number;
}
