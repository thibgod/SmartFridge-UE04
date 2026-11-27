import type { Family, FamilyMember } from './family';
import type { ProductRecord } from './sync';

/**
 * Contrat entre le téléphone et le serveur de synchronisation. Le serveur ne fusionne rien : il
 * vérifie l’appartenance à la famille, numérote les modifications dans l’ordre d’arrivée (`cursor`)
 * et les redistribue. La fusion se fait sur chaque téléphone (voir sync.ts).
 *
 * Aujourd’hui, seule l’implémentation en mémoire existe (memoryServer.ts, pour les tests).
 * L’implémentation réelle (ex. Supabase) devra respecter exactement ce contrat : voir FAMILLE.md.
 */
export interface SyncTransport {
  createFamily(input: { name: string; memberName: string; deviceId: string }): Promise<Family>;
  /** Rejette avec FamilyError('invalid-code') si le code ne correspond à aucune famille. */
  joinFamily(input: { inviteCode: string; memberName: string; deviceId: string }): Promise<Family>;
  /** Quitte la famille : le téléphone ne reçoit plus rien et ne peut plus rien envoyer. */
  leaveFamily(input: { familyId: string; deviceId: string }): Promise<void>;
  members(input: { familyId: string; deviceId: string }): Promise<FamilyMember[]>;
  /** Rejette avec FamilyError('not-member') si le téléphone n’est pas (ou plus) membre. */
  push(input: { familyId: string; deviceId: string; changes: readonly ProductRecord[] }): Promise<void>;
  /** Modifications arrivées après `since` (0 = depuis le début) et nouveau curseur. */
  pull(input: { familyId: string; deviceId: string; since: number }): Promise<{ changes: ProductRecord[]; cursor: number }>;
}
