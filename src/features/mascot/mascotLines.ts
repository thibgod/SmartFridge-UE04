import { toLocalDateString } from '@/utils/date';

import type { MascotFace, MascotMood } from './mascot';

/**
 * Répliques de la mascotte : courtes, au vouvoiement, jamais culpabilisantes. Elle encourage,
 * plaisante, et cite le produit concerné quand elle le connaît. Chaque réplique a son visage.
 * Fonctions pures (tirage et heure injectés) pour être testées.
 */

export interface Line {
  text: string;
  face: MascotFace;
}

/** Un produit dont la mascotte peut parler ; `daysLeft` négatif = date dépassée. */
export interface ProductMention {
  name: string;
  daysLeft: number;
}

/** Ce que la mascotte sait du frigo affiché. */
export interface FridgeSnapshot {
  total: number;
  urgent: number;
  expired: number;
  /** Le produit le plus pressé (périmé ou à consommer vite). */
  soonest?: ProductMention;
}

const NAME_MAX = 24;
const quote = (name: string) => `« ${name.length > NAME_MAX ? `${name.slice(0, NAME_MAX - 1).trimEnd()}…` : name} »`;

const isNight = (now: Date) => now.getHours() >= 22 || now.getHours() < 6;

function hello(now: Date): string {
  const hour = now.getHours();
  if (isNight(now)) return 'Encore debout ?';
  if (hour < 12) return 'Bonjour !';
  if (hour < 18) return 'Bon après-midi !';
  return 'Bonsoir !';
}

/** Ce qui compte le plus en ce moment : les périmés, puis le plus pressé, puis les félicitations. */
function status({ total, urgent, expired, soonest }: FridgeSnapshot): Line {
  if (total === 0) return { text: 'Mon frigo est tout vide… Ajoutez vos courses, je surveille les dates.', face: 'normal' };
  if (expired > 1) return { text: `${expired} produits ont passé leur date. Un petit tri ?`, face: 'worried' };
  if (expired === 1 && soonest) return { text: `${quote(soonest.name)} a dépassé sa date. On vérifie ?`, face: 'worried' };
  if (urgent > 1 && soonest)
    return { text: `${urgent} produits à finir bientôt, à commencer par ${quote(soonest.name)}.`, face: 'normal' };
  if (urgent === 1 && soonest) {
    const when = soonest.daysLeft <= 0 ? 'aujourd’hui' : soonest.daysLeft === 1 ? 'd’ici demain' : 'bientôt';
    return { text: `${quote(soonest.name)} est à finir ${when}.`, face: soonest.daysLeft <= 0 ? 'worried' : 'normal' };
  }
  return { text: 'Tout est frais, rien ne presse. Beau travail !', face: 'love' };
}

export function greetingLine(fridge: FridgeSnapshot, now: Date): Line {
  const line = status(fridge);
  return { text: `${hello(now)} ${line.text}`, face: isNight(now) ? 'sleepy' : line.face };
}

const pick = <T>(items: readonly T[], random: () => number): T =>
  items[Math.min(items.length - 1, Math.floor(random() * items.length))] as T;

/** Phrases génériques, quand le produit n’est pas connu. */
const CONSUMED: readonly Line[] = [
  { text: 'Miam ! Et un de sauvé.', face: 'happy' },
  { text: 'Et hop, zéro gaspi !', face: 'happy' },
  { text: 'Bien joué, la planète vous dit merci.', face: 'love' },
];
const DISCARDED: readonly Line[] = [
  { text: 'Snif… On fera mieux la prochaine fois !', face: 'worried' },
  { text: 'Dommage ! Le congélateur aurait pu aider.', face: 'worried' },
];

/** Avec le nom du produit : tournures sans accord, qui marchent pour « Lait », « Salade » ou « Pommes ». */
const CONSUMED_NAMED: readonly ((q: string) => Line)[] = [
  (q) => ({ text: `Miam ! ${q}, c’est sauvé.`, face: 'happy' }),
  (q) => ({ text: `Bien joué pour ${q} !`, face: 'happy' }),
  (q) => ({ text: `${q} : zéro gaspi, bravo !`, face: 'love' }),
  (q) => ({ text: `Et hop, ${q} : mission accomplie !`, face: 'happy' }),
];
const DISCARDED_NAMED: readonly ((q: string) => Line)[] = [
  (q) => ({ text: `Snif… Adieu ${q}.`, face: 'worried' }),
  (q) => ({ text: `Dommage pour ${q}. On fera mieux !`, face: 'worried' }),
  (q) => ({ text: `${q} à la poubelle… Le congélateur peut aider.`, face: 'worried' }),
  (q) => ({ text: `Oh non, ${q}… Une recette aurait pu aider.`, face: 'worried' }),
];

export function reactionLine(
  mood: Exclude<MascotMood, 'shocked'>,
  product: ProductMention | undefined,
  random: () => number = Math.random,
): Line {
  if (!product) return pick(mood === 'happy' ? CONSUMED : DISCARDED, random);
  const q = quote(product.name);
  // Consommé le dernier jour ou après : un vrai sauvetage, ça se fête.
  if (mood === 'happy' && product.daysLeft <= 0) return { text: `Sauvé de justesse : ${q} !`, face: 'love' };
  return pick(mood === 'happy' ? CONSUMED_NAMED : DISCARDED_NAMED, random)(q);
}

/** Après « Annuler » : le produit revient au frigo. */
export function undoLine(product: ProductMention): Line {
  return { text: `Ouf ! ${quote(product.name)} retourne au frigo.`, face: 'wink' };
}

/** La bulle d’un produit consommé ou jeté porte « Annuler » : elle reste 6 s, comme l’ancien message. */
export const UNDO_WINDOW_MS = 6000;

/** Répliques au toucher, dans l’ordre : la première fait sursauter, puis elle fait le point et plaisante. */
export function tapLine(index: number, fridge: FridgeSnapshot, now: Date): Line {
  if (isNight(now)) {
    const night: readonly Line[] = [
      { text: 'Zzz… Oh ! Vous êtes encore là ?', face: 'sleepy' },
      { text: 'Chut, les yaourts dorment.', face: 'wink' },
      { text: 'Un petit creux ? Je ne dirai rien.', face: 'wink' },
    ];
    return night[index % night.length] as Line;
  }
  const lines: readonly Line[] = [
    { text: 'Hé ! Ça chatouille !', face: 'shocked' },
    status(fridge),
    { text: 'Je garde un œil sur toutes vos dates.', face: 'wink' },
    { text: 'Vous savez que vous êtes mon humain préféré ?', face: 'love' },
    { text: 'Une idée pour ce soir ? Jetez un œil aux Recettes.', face: 'normal' },
    { text: 'Astuce : le congélateur, c’est mon meilleur ami.', face: 'happy' },
    { text: 'Moi, je reste au frais. Toujours.', face: 'wink' },
  ];
  return lines[((index % lines.length) + lines.length) % lines.length] as Line;
}

/** Tapotée trop vite : 4 touchers en moins de 2,5 s. Elle proteste (gentiment). */
export const TEASE_LINE: Line = { text: 'Doucement ! Je suis fragile, moi.', face: 'angry' };

export function isTappingTooFast(tapTimes: readonly number[]): boolean {
  if (tapTimes.length < 4) return false;
  const recent = tapTimes.slice(-4);
  return (recent[3] as number) - (recent[0] as number) < 2500;
}

/** Temps de lecture : 2,6 s minimum, environ 45 ms par caractère au-delà, 6 s au plus. */
export function readingTimeMs(text: string): number {
  return Math.min(6000, Math.max(2600, 1400 + text.length * 45));
}

/** Bonjour une fois par jour. */
export function shouldGreet(lastGreetingDay: string | null, now: Date): boolean {
  return lastGreetingDay !== toLocalDateString(now);
}
