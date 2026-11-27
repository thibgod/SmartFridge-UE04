import { cleanFamilyName, createInviteCode, FamilyError, normalizeInviteCode } from '@/features/family/family';
import { createFamilySync, type FamilySync } from '@/features/family/familySync';
import { createMemorySyncServer } from '@/features/family/memoryServer';
import { isValidRecord, mergeRecord, toProduct, type ProductRecord } from '@/features/family/sync';
import type { Product } from '@/types/product';

/** Générateur pseudo-aléatoire reproductible (mulberry32) : un test qui échoue rejoue à l’identique. */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Horloge commune et contrôlée : chaque téléphone lit l’heure ici, avec un éventuel décalage. */
function createClock(start = '2026-11-17T10:00:00.000Z') {
  let t = Date.parse(start);
  return {
    tick: (ms = 1000) => void (t += ms),
    reader:
      (skewMs = 0) =>
      () =>
        new Date(t + skewMs).toISOString(),
  };
}

const product = (id: string, name: string, extra: Partial<Product> = {}): Product => ({
  id,
  name,
  category: 'produits_laitiers',
  quantity: '1',
  expiresAt: '2026-11-24',
  location: 'frigo',
  source: 'manual',
  status: 'active',
  addedAt: '2026-11-17T09:00:00.000Z',
  updatedAt: '2026-11-17T09:00:00.000Z',
  ...extra,
});

/** Un serveur, une horloge, et des téléphones branchés dessus. */
function setup() {
  const server = createMemorySyncServer({ random: seeded(42) });
  const clock = createClock();
  const phone = (deviceId: string, skewMs = 0) => {
    const connection = server.connect();
    const sync = createFamilySync({ deviceId, transport: connection.transport, now: clock.reader(skewMs) });
    return { sync, setOnline: connection.setOnline };
  };
  return { server, clock, phone };
}

/** Ce que voit un téléphone, sans le champ technique `updatedAt`, pour comparer les frigos entre eux. */
const view = (sync: FamilySync) => sync.products().map(({ updatedAt: _u, ...rest }) => rest);
const byName = (sync: FamilySync, name: string) => sync.products().find((p) => p.name === name);

describe('famille : codes et noms', () => {
  it('génère des codes « XXXX-XXXX » sans caractères ambigus', () => {
    const random = seeded(1);
    for (let i = 0; i < 200; i += 1) {
      const code = createInviteCode(random);
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
      expect(code).not.toMatch(/[01ILO]/);
    }
  });

  it('accepte un code recopié en minuscules, avec espaces ou sans tiret', () => {
    expect(normalizeInviteCode('k7qm 4xpa')).toBe('K7QM-4XPA');
    expect(normalizeInviteCode(' K7QM4XPA ')).toBe('K7QM-4XPA');
    expect(normalizeInviteCode('K7QM-4XP0')).toBeNull(); // « 0 » n’existe pas dans l’alphabet
    expect(normalizeInviteCode('K7QM-4XP')).toBeNull();
    expect(normalizeInviteCode('')).toBeNull();
  });

  it('nettoie les noms et refuse les noms vides ou trop longs', () => {
    expect(cleanFamilyName('  Famille   Martin ')).toBe('Famille Martin');
    expect(cleanFamilyName('   ')).toBeNull();
    expect(cleanFamilyName('x'.repeat(41))).toBeNull();
  });
});

describe('famille : fusion des modifications', () => {
  const at = (s: number) => `2026-11-17T10:00:${String(s).padStart(2, '0')}.000Z`;
  const fields = (name: string, quantity: string) => {
    const { id: _i, status: _s, updatedAt: _u, ...rest } = product('lait', name, { quantity });
    return rest;
  };
  const changes: ProductRecord[] = [
    {
      productId: 'lait',
      fields: { stamp: { at: at(1), deviceId: 'A' }, value: fields('Lait', '1') },
      state: { stamp: { at: at(1), deviceId: 'A' }, value: { status: 'active' } },
    },
    { productId: 'lait', state: { stamp: { at: at(3), deviceId: 'B' }, value: { status: 'consumed', closedAt: at(3) } } },
    { productId: 'lait', fields: { stamp: { at: at(4), deviceId: 'C' }, value: fields('Lait', '2') } },
    { productId: 'lait', fields: { stamp: { at: at(4), deviceId: 'A' }, value: fields('Lait demi-écrémé', '2') } },
  ];

  const permutations = <T>(items: T[]): T[][] =>
    items.length <= 1
      ? [items]
      : items.flatMap((item, i) => permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));

  it('donne le même résultat quel que soit l’ordre d’arrivée (24 ordres testés)', () => {
    const results = permutations(changes).map((order) =>
      order.reduce<ProductRecord | undefined>((acc, c) => mergeRecord(acc, c), undefined),
    );
    for (const result of results) expect(result).toEqual(results[0]);
  });

  it('garde « Consommé » et la quantité corrigée en même temps ; départage les égalités par téléphone', () => {
    const merged = changes.reduce<ProductRecord | undefined>((acc, c) => mergeRecord(acc, c), undefined);
    const result = merged && toProduct(merged);
    expect(result?.status).toBe('consumed');
    // A et C ont modifié à la même seconde : « C » > « A », la version de C l’emporte partout.
    expect(result?.name).toBe('Lait');
    expect(result?.quantity).toBe('2');
  });

  it('applique deux fois la même modification sans effet de bord', () => {
    const once = changes.reduce<ProductRecord | undefined>((acc, c) => mergeRecord(acc, c), undefined);
    const twice = [...changes, ...changes].reduce<ProductRecord | undefined>((acc, c) => mergeRecord(acc, c), undefined);
    expect(twice).toEqual(once);
  });
});

describe('famille : validation des données reçues', () => {
  it('refuse une catégorie ou un emplacement hérité du prototype (« constructor »)', () => {
    const stamp = { at: '2026-11-17T10:00:00.000Z', deviceId: 'A' };
    const { id: _i, status: _s, updatedAt: _u, ...value } = product('x', 'Lait');
    expect(isValidRecord({ productId: 'x', fields: { stamp, value } })).toBe(true);
    expect(isValidRecord({ productId: 'x', fields: { stamp, value: { ...value, category: 'constructor' } } })).toBe(false);
    expect(isValidRecord({ productId: 'x', fields: { stamp, value: { ...value, location: 'toString' } } })).toBe(false);
  });
});

describe('famille : plusieurs téléphones', () => {
  it('crée une famille, la rejoint avec le code et partage le frigo existant', async () => {
    const { phone } = setup();
    const papa = phone('papa');
    const lea = phone('lea');
    papa.sync.add(product('lait', 'Lait'));

    const family = await papa.sync.createFamily('Famille Martin', 'Papa');
    await lea.sync.joinFamily(family.inviteCode.toLowerCase().replace('-', ' '), 'Léa');

    expect(lea.sync.family?.name).toBe('Famille Martin');
    expect(byName(lea.sync, 'Lait')).toBeDefined();
    expect((await papa.sync.members()).map((m) => m.name)).toEqual(['Papa', 'Léa']);
  });

  it('refuse un mauvais code, avant même d’appeler le serveur si le format est faux', async () => {
    const { phone } = setup();
    await phone('papa').sync.createFamily('Famille Martin', 'Papa');
    const intrus = phone('intrus');
    await expect(intrus.sync.joinFamily('ABCD-EFGH', 'Intrus')).rejects.toMatchObject({ code: 'invalid-code' });
    await expect(intrus.sync.joinFamily('pas un code', 'Intrus')).rejects.toBeInstanceOf(FamilyError);
    expect(intrus.sync.family).toBeUndefined();
  });

  it('ajout, consommation et suppression arrivent chez tout le monde', async () => {
    const { phone, clock } = setup();
    const papa = phone('papa');
    const lea = phone('lea');
    const family = await papa.sync.createFamily('Famille Martin', 'Papa');
    await lea.sync.joinFamily(family.inviteCode, 'Léa');

    lea.sync.add(product('yaourt', 'Yaourts'));
    lea.sync.add(product('jambon', 'Jambon'));
    await lea.sync.sync();
    await papa.sync.sync();
    expect(papa.sync.products().map((p) => p.name)).toEqual(['Jambon', 'Yaourts']);

    clock.tick();
    papa.sync.close('yaourt', 'consumed');
    papa.sync.remove('jambon');
    await papa.sync.sync();
    await lea.sync.sync();
    expect(byName(lea.sync, 'Yaourts')?.status).toBe('consumed');
    expect(byName(lea.sync, 'Jambon')).toBeUndefined();
    expect(view(lea.sync)).toEqual(view(papa.sync));
  });

  it('« Annuler » après « Consommé » rouvre le produit chez tout le monde', async () => {
    const { phone, clock } = setup();
    const papa = phone('papa');
    const lea = phone('lea');
    papa.sync.add(product('lait', 'Lait'));
    const family = await papa.sync.createFamily('Famille Martin', 'Papa');
    await lea.sync.joinFamily(family.inviteCode, 'Léa');

    clock.tick();
    lea.sync.close('lait', 'discarded');
    clock.tick();
    lea.sync.reopen('lait');
    await lea.sync.sync();
    await papa.sync.sync();
    expect(byName(papa.sync, 'Lait')?.status).toBe('active');
    expect(byName(papa.sync, 'Lait')?.closedAt).toBeUndefined();
  });

  it('conflit : « Consommé » chez l’un, quantité corrigée hors connexion chez l’autre → les deux sont gardés', async () => {
    const { phone, clock } = setup();
    const papa = phone('papa');
    const lea = phone('lea');
    papa.sync.add(product('lait', 'Lait', { quantity: '1' }));
    const family = await papa.sync.createFamily('Famille Martin', 'Papa');
    await lea.sync.joinFamily(family.inviteCode, 'Léa');

    lea.setOnline(false);
    clock.tick();
    papa.sync.close('lait', 'consumed');
    await papa.sync.sync();
    clock.tick();
    const lait = byName(lea.sync, 'Lait');
    if (!lait) throw new Error('lait absent');
    lea.sync.edit({ ...lait, quantity: '2' });
    await expect(lea.sync.sync()).rejects.toMatchObject({ code: 'offline' });

    lea.setOnline(true);
    await lea.sync.sync();
    await papa.sync.sync();
    for (const sync of [papa.sync, lea.sync]) {
      expect(byName(sync, 'Lait')).toMatchObject({ status: 'consumed', quantity: '2' });
    }
  });

  it('une ancienne modification faite hors connexion n’écrase pas une modification plus récente', async () => {
    const { phone, clock } = setup();
    const papa = phone('papa');
    const lea = phone('lea');
    papa.sync.add(product('lait', 'Lait', { quantity: '1' }));
    const family = await papa.sync.createFamily('Famille Martin', 'Papa');
    await lea.sync.joinFamily(family.inviteCode, 'Léa');

    // Léa corrige d’abord, hors connexion ; Papa corrige ensuite et envoie tout de suite.
    lea.setOnline(false);
    clock.tick();
    const lait = byName(lea.sync, 'Lait');
    if (!lait) throw new Error('lait absent');
    lea.sync.edit({ ...lait, quantity: '2' });
    clock.tick();
    papa.sync.edit({ ...lait, quantity: '3' });
    await papa.sync.sync();

    // La correction de Léa arrive en dernier au serveur, mais c’est la plus ancienne : celle de Papa reste.
    lea.setOnline(true);
    await lea.sync.sync();
    await papa.sync.sync();
    expect(byName(lea.sync, 'Lait')?.quantity).toBe('3');
    expect(byName(papa.sync, 'Lait')?.quantity).toBe('3');
  });

  it('une suppression est définitive, même si quelqu’un modifie le produit plus tard sans l’avoir vue', async () => {
    const { phone, clock } = setup();
    const papa = phone('papa');
    const lea = phone('lea');
    papa.sync.add(product('pain', 'Pain'));
    const family = await papa.sync.createFamily('Famille Martin', 'Papa');
    await lea.sync.joinFamily(family.inviteCode, 'Léa');

    lea.setOnline(false);
    papa.sync.remove('pain');
    await papa.sync.sync();
    clock.tick(60_000);
    const pain = byName(lea.sync, 'Pain');
    if (!pain) throw new Error('pain absent');
    lea.sync.edit({ ...pain, quantity: '3' });
    lea.setOnline(true);
    await lea.sync.sync();
    await papa.sync.sync();
    expect(byName(lea.sync, 'Pain')).toBeUndefined();
    expect(byName(papa.sync, 'Pain')).toBeUndefined();
  });

  it('hors connexion : rien n’est perdu, tout part au retour du réseau', async () => {
    const { phone } = setup();
    const papa = phone('papa');
    const lea = phone('lea');
    const family = await papa.sync.createFamily('Famille Martin', 'Papa');
    await lea.sync.joinFamily(family.inviteCode, 'Léa');

    lea.setOnline(false);
    lea.sync.add(product('oeufs', 'Œufs'));
    lea.sync.add(product('beurre', 'Beurre'));
    await expect(lea.sync.sync()).rejects.toBeInstanceOf(FamilyError);
    expect(lea.sync.pendingCount()).toBe(2);
    expect(lea.sync.products()).toHaveLength(2); // visible tout de suite sur son téléphone

    lea.setOnline(true);
    expect(await lea.sync.sync()).toMatchObject({ pushed: 2 });
    expect(lea.sync.pendingCount()).toBe(0);
    await papa.sync.sync();
    expect(papa.sync.products().map((p) => p.name)).toEqual(['Beurre', 'Œufs']);
  });

  it('tous les téléphones finissent avec le même frigo, quel que soit l’ordre (200 actions aléatoires, horloges décalées)', async () => {
    const { phone, clock } = setup();
    const random = seeded(7);
    // Horloges volontairement décalées : jusqu’à 2 minutes d’écart entre téléphones.
    const phones = [phone('papa', 0), phone('maman', 90_000), phone('lea', -120_000)];
    const [first, ...others] = phones;
    if (!first) throw new Error('pas de téléphone');
    const family = await first.sync.createFamily('Famille Martin', 'Papa');
    for (const p of others) await p.sync.joinFamily(family.inviteCode, 'Membre');

    const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;
    const ids = ['lait', 'pain', 'oeufs', 'beurre', 'pommes', 'jambon'];
    for (let i = 0; i < 200; i += 1) {
      clock.tick(Math.floor(random() * 5_000));
      const p = pick(phones);
      const id = pick(ids);
      const current = p.sync.products().find((x) => x.id === id);
      const action = random();
      if (!current) p.sync.add(product(id, id, { quantity: String(i) }));
      else if (action < 0.35) p.sync.edit({ ...current, quantity: String(i) });
      else if (action < 0.55) p.sync.close(id, random() < 0.5 ? 'consumed' : 'discarded');
      else if (action < 0.75) p.sync.reopen(id);
      else if (action < 0.82) p.sync.remove(id);
      // Réseau capricieux : chaque téléphone se synchronise (ou pas) au hasard.
      if (random() < 0.3) {
        p.setOnline(random() < 0.8);
        await p.sync.sync().catch(() => undefined);
      }
    }

    // Retour du réseau pour tous : deux tours suffisent pour que chacun ait tout reçu.
    for (const p of phones) p.setOnline(true);
    for (let round = 0; round < 2; round += 1) for (const p of phones) await p.sync.sync();
    const [reference, ...rest] = phones.map((p) => view(p.sync));
    for (const fridge of rest) expect(fridge).toEqual(reference);
  });

  it('quitter la famille : le téléphone garde sa copie mais ne reçoit plus rien', async () => {
    const { phone } = setup();
    const papa = phone('papa');
    const lea = phone('lea');
    papa.sync.add(product('lait', 'Lait'));
    const family = await papa.sync.createFamily('Famille Martin', 'Papa');
    await lea.sync.joinFamily(family.inviteCode, 'Léa');

    await lea.sync.leaveFamily();
    papa.sync.add(product('pain', 'Pain'));
    await papa.sync.sync();
    expect(await lea.sync.sync()).toEqual({ pushed: 0, pulled: 0, ignored: 0 });
    expect(lea.sync.products().map((p) => p.name)).toEqual(['Lait']);
    expect((await papa.sync.members()).map((m) => m.name)).toEqual(['Papa']);
  });

  it('le serveur refuse un téléphone qui ne fait pas partie de la famille', async () => {
    const { server, phone } = setup();
    const family = await phone('papa').sync.createFamily('Famille Martin', 'Papa');
    const { transport } = server.connect();
    await expect(transport.pull({ familyId: family.id, deviceId: 'intrus', since: 0 })).rejects.toMatchObject({
      code: 'not-member',
    });
    await expect(transport.push({ familyId: family.id, deviceId: 'intrus', changes: [] })).rejects.toMatchObject({
      code: 'not-member',
    });
  });

  it('ignore les modifications mal formées reçues du serveur', async () => {
    const { server, phone } = setup();
    const papa = phone('papa');
    papa.sync.add(product('lait', 'Lait'));
    const family = await papa.sync.createFamily('Famille Martin', 'Papa');
    server.injectRaw(family.id, { productId: 'lait', deleted: { at: 'hier', deviceId: 'x' } });
    server.injectRaw(family.id, {
      productId: '',
      state: { stamp: { at: '2026-11-17T11:00:00.000Z', deviceId: 'x' }, value: { status: 'active' } },
    });
    server.injectRaw(family.id, {
      productId: 'piege',
      fields: {
        stamp: { at: '2026-11-17T11:00:00.000Z', deviceId: 'x' },
        value: { name: 'Piège', quantity: '1', expiresAt: '2026-11-24', category: 'inconnue', location: 'frigo' },
      },
    });
    expect(await papa.sync.sync()).toMatchObject({ ignored: 3 });
    expect(papa.sync.products().map((p) => p.name)).toEqual(['Lait']);
  });

  it('ne partage pas la photo (fichier local au téléphone)', async () => {
    const { phone } = setup();
    const papa = phone('papa');
    const lea = phone('lea');
    papa.sync.add(product('lait', 'Lait', { imageUri: 'file:///papa/photos/lait.jpg' }));
    const family = await papa.sync.createFamily('Famille Martin', 'Papa');
    await lea.sync.joinFamily(family.inviteCode, 'Léa');
    expect(byName(lea.sync, 'Lait')?.imageUri).toBeUndefined();
  });

  it('reprend après un redémarrage avec les changements en attente', async () => {
    const { server, phone, clock } = setup();
    const papa = phone('papa');
    const family = await papa.sync.createFamily('Famille Martin', 'Papa');
    const connection = server.connect();
    const lea = createFamilySync({ deviceId: 'lea', transport: connection.transport, now: clock.reader() });
    await lea.joinFamily(family.inviteCode, 'Léa');
    connection.setOnline(false);
    lea.add(product('lait', 'Lait'));
    await lea.sync().catch(() => undefined);

    // L’app est fermée puis rouverte : on repart de l’état enregistré.
    const saved = JSON.parse(JSON.stringify(lea.snapshot()));
    connection.setOnline(true);
    const reopened = createFamilySync({ deviceId: 'lea', transport: connection.transport, now: clock.reader(), initial: saved });
    expect(reopened.pendingCount()).toBe(1);
    await reopened.sync();
    await papa.sync.sync();
    expect(byName(papa.sync, 'Lait')).toBeDefined();
  });
});
