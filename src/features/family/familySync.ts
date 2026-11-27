import type { ClosedProductStatus, Product } from '@/types/product';

import { cleanFamilyName, FamilyError, normalizeInviteCode, type Family, type FamilyMember } from './family';
import { applyChanges, fieldsOf, isValidRecord, toProducts, type ProductRecord, type Stamp } from './sync';
import type { SyncTransport } from './transport';

/** État à enregistrer sur le téléphone pour reprendre après un redémarrage (persistance : voir FAMILLE.md). */
export interface FamilySyncSnapshot {
  family?: Family;
  records: ProductRecord[];
  /** Modifications faites ici et pas encore envoyées (hors connexion, par exemple). */
  outbox: ProductRecord[];
  cursor: number;
  lastStampAt: string;
}

export interface SyncResult {
  pushed: number;
  pulled: number;
  /** Modifications reçues mal formées, ignorées. */
  ignored: number;
}

interface Options {
  deviceId: string;
  transport: SyncTransport;
  now?: () => string;
  initial?: FamilySyncSnapshot;
}

/**
 * Le frigo partagé vu depuis un téléphone. Chaque action est appliquée tout de suite sur le téléphone
 * (l’app reste utilisable hors connexion) et notée dans une file d’envoi ; `sync()` envoie la file
 * puis récupère et fusionne les changements des autres membres.
 */
export function createFamilySync({ deviceId, transport, now = () => new Date().toISOString(), initial }: Options) {
  let family = initial?.family;
  let records = new Map((initial?.records ?? []).map((record) => [record.productId, record]));
  let outbox = [...(initial?.outbox ?? [])];
  let cursor = initial?.cursor ?? 0;
  let lastStampAt = initial?.lastStampAt ?? '';
  let running: Promise<SyncResult> | undefined;

  /** Horodatage strictement croissant sur ce téléphone, même si deux actions tombent la même milliseconde. */
  function stamp(): Stamp {
    let at = now();
    if (at <= lastStampAt) at = new Date(Date.parse(lastStampAt) + 1).toISOString();
    lastStampAt = at;
    return { at, deviceId };
  }

  function record(change: ProductRecord): void {
    records = applyChanges(records, [change]);
    outbox.push(change);
  }

  /** En entrant dans une famille, le frigo du téléphone est mis en commun. */
  function shareEverything(): void {
    outbox = [...records.values()];
    cursor = 0;
  }

  async function runSync(): Promise<SyncResult> {
    if (!family) return { pushed: 0, pulled: 0, ignored: 0 };
    const sending = outbox.slice();
    if (sending.length > 0) await transport.push({ familyId: family.id, deviceId, changes: sending });
    // Ce qui a été noté pendant l’envoi reste dans la file pour la prochaine fois.
    outbox = outbox.slice(sending.length);
    const { changes, cursor: next } = await transport.pull({ familyId: family.id, deviceId, since: cursor });
    const valid = changes.filter(isValidRecord);
    records = applyChanges(records, valid);
    cursor = next;
    return { pushed: sending.length, pulled: valid.length, ignored: changes.length - valid.length };
  }

  /**
   * Envoie les changements en attente puis récupère ceux des autres. En cas d’échec (hors connexion),
   * rien n’est perdu : la file est conservée et l’erreur remonte. Deux appels simultanés n’en font qu’un.
   */
  function sync(): Promise<SyncResult> {
    running ??= runSync().finally(() => {
      running = undefined;
    });
    return running;
  }

  return {
    sync,

    get family(): Family | undefined {
      return family;
    },

    /** Produits du frigo partagé (supprimés exclus), triés par date de péremption. */
    products(): Product[] {
      return toProducts(records);
    },

    pendingCount(): number {
      return outbox.length;
    },

    add(product: Product): void {
      const s = stamp();
      record({
        productId: product.id,
        fields: { stamp: s, value: fieldsOf(product) },
        state: {
          stamp: s,
          value: product.closedAt ? { status: product.status, closedAt: product.closedAt } : { status: product.status },
        },
      });
    },

    edit(product: Product): void {
      record({ productId: product.id, fields: { stamp: stamp(), value: fieldsOf(product) } });
    },

    close(productId: string, status: ClosedProductStatus): void {
      const s = stamp();
      record({ productId, state: { stamp: s, value: { status, closedAt: s.at } } });
    },

    reopen(productId: string): void {
      record({ productId, state: { stamp: stamp(), value: { status: 'active' } } });
    },

    remove(productId: string): void {
      record({ productId, deleted: stamp() });
    },

    async createFamily(name: string, memberName: string): Promise<Family> {
      const familyName = cleanFamilyName(name);
      const member = cleanFamilyName(memberName);
      if (!familyName || !member) throw new FamilyError('invalid-name', 'Indiquez un nom de 1 à 40 caractères.');
      const created = await transport.createFamily({ name: familyName, memberName: member, deviceId });
      family = created;
      shareEverything();
      await sync();
      return created;
    },

    async joinFamily(inviteCode: string, memberName: string): Promise<Family> {
      const code = normalizeInviteCode(inviteCode);
      if (!code) throw new FamilyError('invalid-code', 'Le code d’invitation comporte 8 caractères (ex. K7QM-4XPA).');
      const member = cleanFamilyName(memberName);
      if (!member) throw new FamilyError('invalid-name', 'Indiquez un nom de 1 à 40 caractères.');
      const joined = await transport.joinFamily({ inviteCode: code, memberName: member, deviceId });
      family = joined;
      shareEverything();
      await sync();
      return joined;
    },

    /** Quitte la famille : le téléphone garde une copie du frigo, qui redevient personnel. */
    async leaveFamily(): Promise<void> {
      if (!family) return;
      await transport.leaveFamily({ familyId: family.id, deviceId });
      family = undefined;
      outbox = [];
      cursor = 0;
    },

    async members(): Promise<FamilyMember[]> {
      return family ? transport.members({ familyId: family.id, deviceId }) : [];
    },

    snapshot(): FamilySyncSnapshot {
      return { family, records: [...records.values()], outbox: [...outbox], cursor, lastStampAt };
    },
  };
}

export type FamilySync = ReturnType<typeof createFamilySync>;
