import {
  greetingLine,
  isTappingTooFast,
  mostPressing,
  reactionLine,
  readingTimeMs,
  shouldGreet,
  tapLine,
  UNDO_WINDOW_MS,
  undoLine,
  type FridgeSnapshot,
} from '@/features/mascot/mascotLines';

const fridge = (overrides: Partial<FridgeSnapshot> = {}): FridgeSnapshot => ({ total: 6, urgent: 0, expired: 0, ...overrides });
const at = (hour: number) => new Date(2026, 10, 18, hour, 0);
const first = () => 0;
const last = () => 0.999;

describe('bonjour du jour', () => {
  it('cite le produit le plus pressé, avec un visage assorti', () => {
    expect(greetingLine(fridge({ urgent: 1, soonest: { name: 'Lait demi-écrémé', daysLeft: 0 } }), at(8))).toEqual({
      text: 'Bonjour ! « Lait demi-écrémé » est à finir aujourd’hui.',
      face: 'worried',
    });
    expect(greetingLine(fridge({ urgent: 1, soonest: { name: 'Salade', daysLeft: 1 } }), at(14)).text).toBe(
      'Bon après-midi ! « Salade » est à finir d’ici demain.',
    );
    expect(greetingLine(fridge({ urgent: 4, soonest: { name: 'Salade', daysLeft: 2 } }), at(19)).text).toBe(
      'Bonsoir ! 4 produits à finir bientôt, à commencer par « Salade ».',
    );
  });

  it('les produits périmés passent en premier', () => {
    const line = greetingLine(fridge({ urgent: 2, expired: 1, soonest: { name: 'Yaourts', daysLeft: -2 } }), at(9));
    expect(line).toEqual({ text: 'Bonjour ! « Yaourts » a dépassé sa date. On vérifie ?', face: 'worried' });
    expect(greetingLine(fridge({ expired: 3, soonest: { name: 'Yaourts', daysLeft: -2 } }), at(9)).text).toBe(
      'Bonjour ! 3 produits ont passé leur date. Un petit tri ?',
    );
  });

  it('félicite quand tout va bien, encourage quand le frigo est vide, bâille la nuit', () => {
    expect(greetingLine(fridge(), at(10))).toEqual({
      text: 'Bonjour ! Tout est frais, rien ne presse. Beau travail !',
      face: 'love',
    });
    expect(greetingLine(fridge({ total: 0 }), at(10)).text).toBe(
      'Bonjour ! Mon frigo est tout vide… Ajoutez vos courses, je surveille les dates.',
    );
    expect(greetingLine(fridge(), at(23))).toEqual({
      text: 'Encore debout ? Tout est frais, rien ne presse. Beau travail !',
      face: 'sleepy',
    });
  });

  it('raccourcit un nom trop long', () => {
    const line = greetingLine(
      fridge({ urgent: 1, soonest: { name: 'Fromage blanc nature au lait entier bio', daysLeft: 1 } }),
      at(9),
    );
    expect(line.text).toContain('« Fromage blanc nature au… »');
  });
});

describe('réactions', () => {
  it('consommé : nomme le produit, et « de justesse » à la dernière limite', () => {
    expect(reactionLine('happy', { name: 'Lait', daysLeft: 0 }, first)).toEqual({
      text: 'Sauvé de justesse : « Lait » !',
      face: 'love',
    });
    const line = reactionLine('happy', { name: 'Pommes', daysLeft: 5 }, first);
    expect(line.text).toContain('« Pommes »');
    expect(line.face).toBe('happy');
    expect(reactionLine('happy', { name: 'Pommes', daysLeft: 5 }, first).text).not.toBe(
      reactionLine('happy', { name: 'Pommes', daysLeft: 5 }, last).text,
    );
  });

  it('jeté : nomme le produit, déçue mais jamais culpabilisante', () => {
    const line = reactionLine('angry', { name: 'Salade', daysLeft: -3 }, first);
    expect(line.text).toContain('« Salade »');
    expect(line.face).toBe('worried');
    for (const r of [0, 0.3, 0.6, 0.99])
      expect(reactionLine('angry', { name: 'x'.repeat(24), daysLeft: 0 }, () => r).text.length).toBeLessThanOrEqual(70);
  });

  it('sans produit connu, reste générique', () => {
    expect(reactionLine('happy', undefined, first).text).not.toContain('«');
  });

  it('après « Annuler », elle remet le produit au frigo', () => {
    expect(undoLine({ name: 'Lait', daysLeft: 1 })).toEqual({ text: 'Ouf ! « Lait » retourne au frigo.', face: 'wink' });
  });
});

describe('au toucher', () => {
  it('enchaîne des répliques variées sans répéter la précédente', () => {
    const lines = [0, 1, 2, 3, 4, 5, 6].map((i) =>
      tapLine(i, fridge({ urgent: 2, soonest: { name: 'Salade', daysLeft: 1 } }), at(15)),
    );
    lines.forEach((line, i) => expect(line.text).not.toBe(lines[i - 1]?.text));
    expect(lines[0]).toEqual({ text: 'Hé ! Ça chatouille !', face: 'shocked' });
    expect(lines.map((l) => l.face)).toEqual(expect.arrayContaining(['wink', 'love']));
  });

  it('la nuit, elle somnole ; tapotée trop vite, elle proteste', () => {
    expect(tapLine(0, fridge(), at(2))).toEqual({ text: 'Zzz… Oh ! Vous êtes encore là ?', face: 'sleepy' });
    expect(isTappingTooFast([1000, 1500, 2000, 2400])).toBe(true);
    expect(isTappingTooFast([1000, 5000, 9000, 13000])).toBe(false);
    expect(isTappingTooFast([1000, 1500])).toBe(false);
  });
});

describe('rythme', () => {
  it('laisse le temps de lire, borné', () => {
    expect(readingTimeMs('Miam !')).toBe(2600);
    expect(readingTimeMs('Bonjour ! 3 produits à consommer vite.')).toBeGreaterThan(2600);
    expect(readingTimeMs('x'.repeat(400))).toBe(6000);
  });

  it('donne 6 s pour annuler, comme l’ancien message', () => {
    expect(UNDO_WINDOW_MS).toBe(6000);
  });

  it('ne dit pas bonjour deux fois le même jour', () => {
    expect(shouldGreet(null, at(9))).toBe(true);
    expect(shouldGreet('2026-11-18', at(21))).toBe(false);
    expect(shouldGreet('2026-11-17', at(7))).toBe(true);
  });
});

describe('produit dont parle la mascotte', () => {
  const now = new Date(2026, 10, 24, 15, 0);
  const p = (name: string, expiresAt: string, status: 'active' | 'consumed' = 'active') => ({ name, expiresAt, status });

  it('choisit le plus pressé, périmé compris : jamais un produit qui périme demain avant un périmé', () => {
    const mention = mostPressing([p('Lait', '2026-11-25'), p('Yaourts', '2026-11-23'), p('Pommes', '2026-12-03')], now);
    expect(mention).toEqual({ name: 'Yaourts', daysLeft: -1 });
  });

  it('ignore les produits déjà consommés, et rien quand le frigo est vide', () => {
    expect(mostPressing([p('Vieux lait', '2026-11-01', 'consumed'), p('Pommes', '2026-12-03')], now)?.name).toBe('Pommes');
    expect(mostPressing([], now)).toBeUndefined();
  });
});
