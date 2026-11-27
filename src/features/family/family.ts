/**
 * Famille SmartFridge : plusieurs téléphones partagent le même frigo.
 *
 * Ce module ne contient que des types et des fonctions pures. Aucune donnée ne quitte le téléphone
 * tant qu’un vrai transport (serveur) n’est pas branché : voir FAMILLE.md.
 */

export interface Family {
  id: string;
  name: string;
  /** Code à transmettre aux autres membres pour qu’ils rejoignent la famille (ex. « K7QM-4XPA »). */
  inviteCode: string;
}

export interface FamilyMember {
  /** Identifiant du téléphone (un membre = un téléphone dans cette première version). */
  deviceId: string;
  name: string;
  joinedAt: string; // ISO
}

export type FamilyErrorCode = 'invalid-code' | 'not-member' | 'offline' | 'invalid-name';

export class FamilyError extends Error {
  constructor(
    readonly code: FamilyErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'FamilyError';
  }
}

/** Sans 0/O, 1/I/L : un code lu à voix haute ou recopié ne se confond pas. */
const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const INVITE_LENGTH = 8;

/**
 * Code d’invitation « XXXX-XXXX ». `random` est injecté pour les tests ;
 * un vrai serveur doit utiliser un générateur cryptographique.
 */
export function createInviteCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < INVITE_LENGTH; i += 1) {
    code += INVITE_ALPHABET[Math.floor(random() * INVITE_ALPHABET.length)] ?? 'A';
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/** Tolère minuscules, espaces et tirets oubliés : « k7qm 4xpa » → « K7QM-4XPA ». Retourne null si invalide. */
export function normalizeInviteCode(input: string): string | null {
  const compact = input.toUpperCase().replace(/[\s-]/g, '');
  if (compact.length !== INVITE_LENGTH) return null;
  for (const char of compact) if (!INVITE_ALPHABET.includes(char)) return null;
  return `${compact.slice(0, 4)}-${compact.slice(4)}`;
}

const NAME_MAX = 40;

/** Nom de famille ou de membre : espaces superflus retirés, 1 à 40 caractères. Retourne null si invalide. */
export function cleanFamilyName(input: string): string | null {
  const name = input.trim().replace(/\s+/g, ' ');
  return name.length > 0 && name.length <= NAME_MAX ? name : null;
}
