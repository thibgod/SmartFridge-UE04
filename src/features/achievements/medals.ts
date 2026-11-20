import type { Badge } from './achievements';

/**
 * Habillage des badges en médailles, à la manière des récompenses d’Apple Fitness :
 * le métal dit la difficulté, la forme dit la famille (produits sauvés, séries, cuisine, impact).
 */
export type MedalTier = 'bronze' | 'argent' | 'or' | 'platine';
export type MedalShape = 'cercle' | 'hexagone' | 'octogone' | 'rosace';

export interface Medal {
  tier: MedalTier;
  shape: MedalShape;
}

const MEDALS: Record<string, Medal> = {
  'first-save': { tier: 'bronze', shape: 'cercle' },
  'save-10': { tier: 'argent', shape: 'cercle' },
  'save-50': { tier: 'or', shape: 'cercle' },
  'save-100': { tier: 'platine', shape: 'cercle' },
  week: { tier: 'argent', shape: 'hexagone' },
  month: { tier: 'or', shape: 'hexagone' },
  chef: { tier: 'bronze', shape: 'octogone' },
  'chef-10': { tier: 'or', shape: 'octogone' },
  'euros-50': { tier: 'argent', shape: 'rosace' },
  'co2-25': { tier: 'or', shape: 'rosace' },
};

export function medalOf(badge: Pick<Badge, 'id'>): Medal {
  return MEDALS[badge.id] ?? { tier: 'bronze', shape: 'cercle' };
}

export const TIER_LABEL: Record<MedalTier, string> = {
  bronze: 'Médaille de bronze',
  argent: 'Médaille d’argent',
  or: 'Médaille d’or',
  platine: 'Médaille de platine',
};

/**
 * Badges obtenus depuis la dernière visite. `seen` à null = la fonction n’a jamais tourné :
 * on ne fête pas d’un coup tout ce qui avait été gagné avant.
 */
export function newlyEarned(badges: readonly Badge[], seen: readonly string[] | null): string[] {
  if (seen === null) return [];
  return badges.filter((b) => b.achieved && !seen.includes(b.id)).map((b) => b.id);
}

export function seenAfterOpening(seen: readonly string[], id: string): string[] {
  return seen.includes(id) ? [...seen] : [...seen, id];
}

/** Sommets d’un polygone régulier, pointe en haut (attribut `points` d’un <Polygon>). */
export function polygonPoints(sides: number, cx: number, cy: number, r: number, inner?: number): string {
  const count = inner ? sides * 2 : sides;
  return Array.from({ length: count }, (_, i) => {
    const radius = inner && i % 2 === 1 ? inner : r;
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    const x = Math.round((cx + radius * Math.cos(angle)) * 100) / 100;
    const y = Math.round((cy + radius * Math.sin(angle)) * 100) / 100;
    return `${x},${y}`;
  }).join(' ');
}

/**
 * Rotation de la médaille (en degrés, 0 = face, 180 = revers). Fonctions « worklet » : elles
 * tournent sur le fil d’interface, à la fin du geste, sans attendre JavaScript.
 */

/** Degrés d’élan gagnés par pixel/seconde de vitesse au lâcher. */
const SPIN_MOMENTUM = 0.12;
/** Un lancer ajoute au plus un tour : la médaille ne s’emballe pas. */
const MAX_EXTRA_TURN = 360;

/** Angle où la médaille se pose : la face la plus proche (avant ou revers), après un peu d’élan. */
export function restingAngle(rotation: number, velocityX: number): number {
  'worklet';
  const momentum = Math.max(-MAX_EXTRA_TURN, Math.min(MAX_EXTRA_TURN, velocityX * SPIN_MOMENTUM));
  return Math.round((rotation + momentum) / 180) * 180;
}

/** Un toucher retourne la médaille d’un demi-tour, à partir de la face où elle est posée. */
export function flipAngle(rotation: number): number {
  'worklet';
  return Math.round(rotation / 180) * 180 + 180;
}

export function isShowingBack(rotation: number): boolean {
  'worklet';
  return Math.abs(Math.round(rotation / 180)) % 2 === 1;
}
