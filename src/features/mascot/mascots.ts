/**
 * Mascottes au choix (Réglages › Apparence). Le frigo reste la mascotte par défaut et l’identité de
 * SmartFridge ; les autres sont des personnages originaux qui partagent ses expressions et ses
 * animations (même visage, mêmes bras).
 */
export type MascotId = 'fridge' | 'jar' | 'carton';

export const MASCOTS: Record<MascotId, { label: string; description: string }> = {
  fridge: { label: 'Frigo', description: 'La mascotte de SmartFridge, une feuille sur la tête.' },
  jar: { label: 'Bocal', description: 'Un bocal de confiture maison, couvercle à carreaux.' },
  carton: { label: 'Brique', description: 'Une brique de lait, toujours prête à trinquer.' },
};

export const MASCOT_ORDER: readonly MascotId[] = ['fridge', 'jar', 'carton'];
export const DEFAULT_MASCOT: MascotId = 'fridge';

export function isMascotId(value: unknown): value is MascotId {
  return typeof value === 'string' && value in MASCOTS;
}
