import type { ClosedProductStatus } from '@/types/product';

/** Réactions de la mascotte : contente (consommé), fâchée (jeté), choquée (touchée). */
export type MascotMood = 'happy' | 'angry' | 'shocked';

/**
 * Expression affichée : la neutre au repos, une réaction, ou l’humeur de ce qu’elle dit
 * (amoureuse, clin d’œil, endormie, inquiète).
 */
export type MascotFace = 'normal' | MascotMood | 'love' | 'wink' | 'sleepy' | 'worried';

/** Produit concerné par une réaction ; `daysLeft` négatif = date dépassée. */
export interface MascotProduct {
  name: string;
  daysLeft: number;
  /** Remet le produit au frigo : la bulle affiche alors « Annuler ». */
  undo?: () => void;
}

export function moodForClosedStatus(status: ClosedProductStatus): MascotMood {
  return status === 'consumed' ? 'happy' : 'angry';
}

/** Renvoie `true` si la mascotte est à l’écran et a pris la réaction en charge. */
type Listener = (mood: MascotMood, product?: MascotProduct) => boolean | void;
const listeners = new Set<Listener>();

/**
 * Prévient la mascotte, où qu’elle soit affichée. Un simple canal en mémoire : l’action peut venir
 * d’un autre écran (fiche produit) que celui où vit la mascotte (accueil). Renvoie `false` si
 * personne ne l’a montrée à l’écran : l’appelant affiche alors son message habituel.
 */
export function emitMascotMood(mood: MascotMood, product?: MascotProduct): boolean {
  let handled = false;
  listeners.forEach((listener) => {
    if (listener(mood, product) === true) handled = true;
  });
  return handled;
}

export function subscribeMascotMood(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface MascotContext {
  /** L’écran « Mon frigo » est affiché (les onglets restent montés en arrière-plan). */
  focused: boolean;
  /** La liste a défilé : des produits passent derrière la mascotte. */
  scrolled: boolean;
  /** Une ligne est ouverte par un balayage : son panneau « Consommé » est à gauche, sous la mascotte. */
  rowOpen: boolean;
  /** Une réaction (consommé, jeté, toucher) est en cours. */
  reacting: boolean;
  reduceMotion: boolean;
}

export interface MascotPose {
  /** Cachée derrière la barre du bas : ne couvre rien et ne capte aucun toucher. */
  tucked: boolean;
  /** Respiration en boucle : seulement quand on la voit, pour ne pas dépenser de batterie pour rien. */
  breathing: boolean;
}

export function mascotPose({ focused, scrolled, rowOpen, reacting, reduceMotion }: MascotContext): MascotPose {
  const tucked = (scrolled || rowOpen) && !reacting;
  return { tucked, breathing: focused && !tucked && !reacting && !reduceMotion };
}
