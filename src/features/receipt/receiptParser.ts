import { normalizeText } from '@/utils/text';

/** Article reconnu sur un ticket de caisse. */
export interface ReceiptLine {
  name: string;
  /** Prix unitaire en euros, si lu sur la même ligne. */
  price?: number;
  quantity: number;
}

/** Le ticket s’arrête au total : tout ce qui suit (paiement, TVA, fidélité) est ignoré. */
const END_OF_ITEMS = /^(sous[- ]?total|total|net a payer|a payer|montant du|nombre d.?articles|nb articles)\b/;

/** Lignes d’en-tête ou de pied de ticket : jamais des produits. */
const NOISE_WORDS = [
  'tva', 'ttc', 'ht', 'cb', 'carte', 'especes', 'rendu', 'monnaie', 'merci', 'ticket', 'caisse', 'caissier',
  'caissiere', 'magasin', 'siret', 'siren', 'tel', 'telephone', 'date', 'heure', 'remise', 'reduction',
  'fidelite', 'points', 'cagnotte', 'avoir', 'paiement', 'payer', 'visa', 'mastercard', 'contact', 'horaires',
  'rue', 'avenue', 'boulevard', 'bd', 'cedex', 'sas', 'sarl', 'client', 'transaction', 'autorisation', 'montant',
  'euro', 'euros', 'eur', 'solde', 'bienvenue', 'bientot', 'conservez', 'numero', 'sac', 'consigne', 'qte',
  'facture', 'vendeur', 'operation', 'debit', 'credit', 'commercant', 'www', 'http', 'com', 'fr',
];
const NOISE = new Set(NOISE_WORDS);

const PRICE_AT_END = /\s*(-?\d{1,4}[,.]\d{2})\s*(?:€|eur)?\s*(?:[a-z0-9]|\*)?\s*$/i;
const MULTIPLIER = /^(\d{1,2})\s*[x*]\s*\d{1,4}[,.]\d{2}/i;
const DATE_OR_TIME = /\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{1,2}[:h]\d{2}/i;
const POSTAL_CODE = /\b\d{5}\b/;

/** Accents absents des tickets (souvent en majuscules sans accents), pour des noms lisibles. */
const ACCENTS: Record<string, string> = {
  creme: 'crème', cremes: 'crèmes', fraiche: 'fraîche', fraiches: 'fraîches', oeuf: 'œuf', oeufs: 'œufs',
  boeuf: 'bœuf', legume: 'légume', legumes: 'légumes', epinard: 'épinard', epinards: 'épinards', cafe: 'café',
  roti: 'rôti', gruyere: 'gruyère', peche: 'pêche', peches: 'pêches', cereales: 'céréales', pates: 'pâtes',
  pate: 'pâte', puree: 'purée', hache: 'haché', hachee: 'hachée', rape: 'râpé', rapee: 'râpée',
  ecreme: 'écrémé', epaisse: 'épaisse', epais: 'épais', the: 'thé', celeri: 'céleri', chevre: 'chèvre',
  clementine: 'clémentine', clementines: 'clémentines', mais: 'maïs',
  crepe: 'crêpe', crepes: 'crêpes', cote: 'côte', cotes: 'côtes', epaule: 'épaule',
  emince: 'émincé', eminces: 'émincés', saute: 'sauté', grille: 'grillé', fume: 'fumé', fumee: 'fumée',
  boulangere: 'boulangère', mache: 'mâche',
};

const FORMAT_TOKEN = /^(\d+([,.]\d+)?(g|gr|kg|cl|ml|l|x)|x\d+|\d+x\d+([,.]\d+)?(g|gr|kg|cl|ml|l)?|\d+%|\d+([,.]\d+)?|[a-z]?\d{3,}[a-z]?)$/i;

const letterCount = (text: string) => (text.match(/\p{L}/gu) ?? []).length;

function cleanName(raw: string): string {
  const words = raw
    .replace(/[*#=_|]+/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !FORMAT_TOKEN.test(word));
  const isUpper = raw === raw.toUpperCase();
  const fixed = words.map((word) => {
    const lower = word.toLowerCase();
    const key = normalizeText(lower);
    return isUpper ? (ACCENTS[key] ?? lower) : word;
  });
  const name = fixed.join(' ').replace(/\s+([,.])/g, '$1').trim();
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function isNoise(text: string): boolean {
  if (DATE_OR_TIME.test(text) || POSTAL_CODE.test(text)) return true;
  if (text.includes('@')) return true;
  const words = normalizeText(text).split(/[^a-z0-9]+/).filter(Boolean);
  return words.some((word) => NOISE.has(word));
}

const PRICE_ONLY = /^-?\d{1,4}[,.]\d{2}\s*(?:€|eur)?\s*[a-z*]?$/i;

/**
 * La lecture d’image renvoie souvent la colonne des libellés, puis celle des prix.
 * On recolle les deux en les alignant par le bas : la dernière ligne de prix (le total
 * ou le paiement) correspond au dernier libellé, l’en-tête du ticket reste sans prix.
 */
export function mergePriceColumn(rows: readonly string[]): string[] {
  const start = rows.findIndex((row, i) => PRICE_ONLY.test(row) && PRICE_ONLY.test(rows[i + 1] ?? ''));
  if (start < 0) return [...rows];
  let end = start;
  while (end < rows.length && PRICE_ONLY.test(rows[end] ?? '')) end += 1;

  const prices = rows.slice(start, end);
  const before = rows.slice(0, start);
  const labelIndexes = before.flatMap((row, i) => (letterCount(row) >= 2 && !PRICE_AT_END.test(row) ? [i] : []));
  if (labelIndexes.length < prices.length) return [...rows];

  const merged = [...before];
  const paired = labelIndexes.slice(-prices.length);
  paired.forEach((rowIndex, i) => {
    merged[rowIndex] = `${before[rowIndex]} ${prices[i]}`;
  });
  return [...merged, ...rows.slice(end)];
}

/**
 * Transforme le texte lu sur un ticket (une entrée par ligne ou bloc reconnu) en articles.
 * Heuristique volontairement prudente : l’utilisateur relit et coche la liste avant tout ajout.
 */
export function parseReceipt(texts: readonly string[]): ReceiptLine[] {
  const lines: ReceiptLine[] = [];
  const byName = new Map<string, ReceiptLine>();

  const rows = mergePriceColumn(
    texts
      .flatMap((text) => text.split(/\n+/))
      .map((row) => row.replace(/\s+/g, ' ').trim())
      .filter(Boolean),
  );
  // L’en-tête (enseigne, adresse) précède le premier article payé : on commence là.
  const firstPriced = rows.findIndex((row) => PRICE_AT_END.test(row) && letterCount(row) >= 3);

  for (const text of rows.slice(Math.max(0, firstPriced))) {
    if (END_OF_ITEMS.test(normalizeText(text))) break;

    // « 2 x 1,50 » : quantité de l’article précédent.
    const multiplier = MULTIPLIER.exec(text);
    if (multiplier) {
      const previous = lines[lines.length - 1];
      if (previous) previous.quantity = Math.max(previous.quantity, Number(multiplier[1]));
      continue;
    }

    const priceMatch = PRICE_AT_END.exec(text);
    const price = priceMatch ? Number(priceMatch[1]?.replace(',', '.')) : undefined;
    const label = priceMatch ? text.slice(0, priceMatch.index) : text;

    if (letterCount(label) < 3 || isNoise(label)) continue;
    if (price !== undefined && price < 0) continue; // remise
    const name = cleanName(label);
    if (letterCount(name) < 3) continue;

    const key = normalizeText(name);
    const existing = byName.get(key);
    if (existing) {
      existing.quantity += 1;
      continue;
    }
    const line: ReceiptLine = { name, price: price !== undefined && price > 0 ? price : undefined, quantity: 1 };
    byName.set(key, line);
    lines.push(line);
  }
  return lines;
}
