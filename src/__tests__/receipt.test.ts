import { parseReceipt } from '@/features/receipt/receiptParser';
import { candidateExpiry, candidateToInput, coveredShoppingItems, toCandidates } from '@/features/receipt/receiptItems';

const TICKET = [
  'CARREFOUR MARKET',
  '12 RUE DE LA PAIX',
  '75002 PARIS',
  'TEL 01 23 45 67 89',
  '15/10/2026 18:42',
  'CREME FRAICHE EPAISSE 20CL   1,89 A',
  'YAOURT NATURE 4X125G         1,25',
  'BANANES                      2,10 €',
  'BANANES                      2,10',
  'LAIT DEMI ECREME 1L',
  '2 X 1,05',
  'REMISE FIDELITE             -0,50',
  'SAC CABAS                    0,10',
  'OEUFS PLEIN AIR X6           2,49',
  '1,99',
  'TOTAL                       11,92',
  'CB                          11,92',
  'POMMES GOLDEN                 3,00',
];

describe('lecture d’un ticket de caisse', () => {
  const lines = parseReceipt(TICKET);

  it('garde les produits et ignore en-tête, remises, sac et pied de ticket', () => {
    expect(lines.map((l) => l.name)).toEqual([
      'Crème fraîche épaisse',
      'Yaourt nature',
      'Bananes',
      'Lait demi écrémé',
      'Œufs plein air',
    ]);
  });

  it('lit les prix, regroupe les doublons et applique les multiplicateurs', () => {
    expect(lines[0]?.price).toBe(1.89);
    expect(lines.find((l) => l.name === 'Bananes')?.quantity).toBe(2);
    expect(lines.find((l) => l.name.startsWith('Lait'))?.quantity).toBe(2);
    expect(lines.find((l) => l.name.startsWith('Lait'))?.price).toBeUndefined();
  });

  it('respecte la casse d’un texte déjà en minuscules et accepte plusieurs lignes par bloc', () => {
    expect(parseReceipt(['Tomates cerises 2,50\nCoca-Cola 1,5L 1,80']).map((l) => l.name)).toEqual([
      'Tomates cerises',
      'Coca-Cola',
    ]);
  });

  it('ne retourne rien pour un texte sans produit', () => {
    expect(parseReceipt(['MERCI DE VOTRE VISITE', '12:30', '****'])).toEqual([]);
  });
});

describe('préparation des articles du ticket', () => {
  const candidates = toCandidates([
    { name: 'Yaourt nature', price: 1.25, quantity: 2 },
    { name: 'Baguette tradition', quantity: 1 },
    { name: 'Pâtes coquillettes', quantity: 1 },
    { name: 'Lessive liquide', price: 8.9, quantity: 1 },
  ]);

  it('coche les aliments reconnus, range au bon endroit et calcule le prix de la ligne', () => {
    expect(candidates.map((c) => [c.category, c.location, c.selected])).toEqual([
      ['produits_laitiers', 'frigo', true],
      ['feculents', 'placard', true],
      ['feculents', 'placard', true],
      ['autre', 'placard', false],
    ]);
    expect(candidates[0]?.price).toBe(2.5);
  });

  it('estime une date prudente, courte pour le pain', () => {
    expect(candidateExpiry(candidates[0]!, '2026-10-15')).toBe('2026-10-22');
    expect(candidateExpiry(candidates[1]!, '2026-10-15')).toBe('2026-10-18');
    expect(candidateToInput(candidates[0]!, '2026-10-15')).toMatchObject({ quantity: '2', price: 2.5, expiresAt: '2026-10-22' });
  });

  it('retrouve les articles de la liste de courses achetés', () => {
    const list = [
      { id: 'a', name: 'Lait', category: 'produits_laitiers', quantity: '', checked: false, source: 'manual', addedAt: '' },
      { id: 'b', name: 'Beurre', category: 'produits_laitiers', quantity: '', checked: false, source: 'manual', addedAt: '' },
      { id: 'c', name: 'Yaourts', category: 'produits_laitiers', quantity: '', checked: true, source: 'manual', addedAt: '' },
    ] as const;
    const covered = coveredShoppingItems(['Lait demi écrémé', 'Petits pains au beurre', 'Yaourt nature'], [...list]);
    expect(covered.map((item) => item.id)).toEqual(['a', 'c']);
  });
});

describe('ticket lu en deux colonnes (libellés puis prix)', () => {
  const VISION = [
    'CARREFOUR CITY',
    '12 RUE DE LA PAIX',
    '75002 PARIS',
    '15/10/2026 18:42',
    'CREME FRAICHE 20CL',
    'YAOURT NATURE 4X125G',
    'BANANES',
    'LAIT DEMI ECREME 1L',
    'POULET FILET 400G',
    'COURGETTES',
    'BAGUETTE TRADITION',
    'LESSIVE LIQUIDE',
    'SAC CABAS',
    'TOTAL',
    'CB',
    '1,89',
    '1,25',
    '2,10',
    '1,05',
    '5,49',
    '1,80',
    '1,20',
    '8,90',
    '0,10',
    '23,78',
    '23,78',
    'MERCI DE VOTRE VISITE',
  ];

  it('recolle chaque prix à son libellé et ignore l’en-tête', () => {
    const lines = parseReceipt(VISION);
    expect(lines.map((l) => [l.name, l.price])).toEqual([
      ['Crème fraîche', 1.89],
      ['Yaourt nature', 1.25],
      ['Bananes', 2.1],
      ['Lait demi écrémé', 1.05],
      ['Poulet filet', 5.49],
      ['Courgettes', 1.8],
      ['Baguette tradition', 1.2],
      ['Lessive liquide', 8.9],
    ]);
  });
});
