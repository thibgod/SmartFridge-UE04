import { createInviteCode, FamilyError, normalizeInviteCode, type Family, type FamilyMember } from './family';
import type { ProductRecord } from './sync';
import type { SyncTransport } from './transport';

interface StoredFamily extends Family {
  members: Map<string, FamilyMember>;
  log: ProductRecord[];
}

export interface MemoryConnection {
  transport: SyncTransport;
  /** Simule la perte de réseau : toutes les requêtes échouent avec FamilyError('offline'). */
  setOnline(online: boolean): void;
}

/**
 * Serveur de synchronisation simulé, en mémoire. Il sert aux tests et décrit le comportement attendu
 * du vrai serveur (contrôle d’appartenance, journal numéroté). Il n’est jamais utilisé par l’app.
 */
export function createMemorySyncServer(options: { random?: () => number; now?: () => string } = {}) {
  const random = options.random ?? Math.random;
  const now = options.now ?? (() => new Date().toISOString());
  const families = new Map<string, StoredFamily>();
  let nextFamily = 1;

  const familyOf = (familyId: string, deviceId: string): StoredFamily => {
    const family = families.get(familyId);
    if (!family?.members.has(deviceId)) throw new FamilyError('not-member', 'Ce téléphone ne fait pas partie de cette famille.');
    return family;
  };
  const publicFamily = ({ id, name, inviteCode }: StoredFamily): Family => ({ id, name, inviteCode });
  // Copie profonde : comme sur un vrai réseau, rien n’est partagé par référence entre téléphones.
  const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

  const server: SyncTransport = {
    async createFamily({ name, memberName, deviceId }) {
      const family: StoredFamily = {
        id: `famille-${nextFamily++}`,
        name,
        inviteCode: createInviteCode(random),
        members: new Map([[deviceId, { deviceId, name: memberName, joinedAt: now() }]]),
        log: [],
      };
      families.set(family.id, family);
      return publicFamily(family);
    },
    async joinFamily({ inviteCode, memberName, deviceId }) {
      const code = normalizeInviteCode(inviteCode);
      const family = [...families.values()].find((f) => f.inviteCode === code);
      if (!family) throw new FamilyError('invalid-code', 'Ce code ne correspond à aucune famille.');
      family.members.set(deviceId, { deviceId, name: memberName, joinedAt: now() });
      return publicFamily(family);
    },
    async leaveFamily({ familyId, deviceId }) {
      familyOf(familyId, deviceId).members.delete(deviceId);
    },
    async members({ familyId, deviceId }) {
      return copy([...familyOf(familyId, deviceId).members.values()]);
    },
    async push({ familyId, deviceId, changes }) {
      familyOf(familyId, deviceId).log.push(...copy(changes));
    },
    async pull({ familyId, deviceId, since }) {
      const { log } = familyOf(familyId, deviceId);
      return { changes: copy(log.slice(since)), cursor: log.length };
    },
  };

  return {
    /** Branche un téléphone sur le serveur, avec un interrupteur réseau. */
    connect(): MemoryConnection {
      let online = true;
      const guard =
        <A extends unknown[], R>(fn: (...args: A) => Promise<R>) =>
        async (...args: A): Promise<R> => {
          if (!online) throw new FamilyError('offline', 'Pas de connexion : les changements seront envoyés plus tard.');
          return fn(...args);
        };
      const transport: SyncTransport = {
        createFamily: guard(server.createFamily),
        joinFamily: guard(server.joinFamily),
        leaveFamily: guard(server.leaveFamily),
        members: guard(server.members),
        push: guard(server.push),
        pull: guard(server.pull),
      };
      return { transport, setOnline: (value) => void (online = value) };
    },
    /** Pour les tests : injecter une donnée hors contrat, comme le ferait un client malveillant. */
    injectRaw(familyId: string, record: unknown): void {
      families.get(familyId)?.log.push(record as ProductRecord);
    },
  };
}
