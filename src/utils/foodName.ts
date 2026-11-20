import { normalizeText } from './text';

/**
 * Analyse d’un nom d’aliment en français. Le nom principal est le premier groupe de mots ;
 * ce qui suit « au », « de », « à la »… le précise sans changer sa nature :
 *   « Petits pains au beurre » → du pain (pas du beurre)
 *   « Yaourt à la fraise »     → un yaourt
 *   « Jus d’orange »           → un jus
 * Exceptions : les noms composés (« pomme de terre », « pâte à tartiner ») restent entiers,
 * et un contenant ou une découpe (« filet de… », « pot de… ») renvoie à l’aliment qui suit.
 */

/** Noms composés dont la préposition fait partie du nom (forme normalisée et au singulier). */
const COMPOUNDS = [
  // Les plus longs d’abord : « salade de pomme de terre » avant « pomme de terre ».
  'salade de pomme de terre',
  'salade de pate',
  'salade de riz',
  'salade de lentille',
  'pomme de terre',
  'patate douce',
  'pain de mie',
  'pain au chocolat',
  'pain aux raisin',
  'pain d epice',
  'pate a tartiner',
  'pate brisee',
  'pate feuilletee',
  'pate sablee',
  'creme dessert',
  'creme brulee',
  'creme anglaise',
  'creme glacee',
  'creme caramel',
  'creme patissiere',
  'pate a pizza',
  'pate a crepe',
  'pate de fruit',
  'noix de coco',
  'lait de coco',
  'lait d amande',
  'lait d avoine',
  'lait de soja',
  'creme de marron',
  'creme de soja',
  'fruit de mer',
  'salade de fruit',
  'chou de bruxelles',
  'riz au lait',
  'cote de boeuf',
  'cote de porc',
  'jambon de pays',
  'jambon de bayonne',
  'jambon de parme',
  'fromage de chevre',
  'yaourt a boire',
  'oeuf de caille',
  'fond de veau',
  'pomme d api',
];

/** Mots qui introduisent un complément (« au beurre », « saveur fromage »). */
const PREPOSITIONS = new Set([
  'a', 'au', 'aux', 'de', 'du', 'des', 'd', 'en', 'avec', 'sans', 'pour', 'sur', 'facon', 'saveur', 'gout', 'parfum', 'arome', 'aromatise', 'aromatisee', 'et',
]);

/** Articles et mots vides ignorés partout. */
const ARTICLES = new Set(['le', 'la', 'les', 'l', 'un', 'une']);

/** Contenants, découpes et portions : « filet de saumon » est du saumon. */
const FORM_WORDS = new Set([
  'filet', 'blanc', 'escalope', 'cuisse', 'aile', 'pave', 'tranche', 'morceau', 'steak', 'dos', 'longe', 'rouelle',
  'pot', 'brique', 'bouteille', 'sachet', 'boite', 'paquet', 'barquette', 'bocal', 'botte', 'sac', 'portion', 'dose',
  'tablette', 'pack', 'lot', 'cube', 'tube', 'boule', 'gousse', 'feuille', 'branche', 'tete', 'bouquet', 'poignee',
  'verre', 'canette', 'conserve', 'plaquette', 'rouleau', 'part',
]);

/**
 * Préparations dont le nom suivant n’est qu’un parfum, même sans préposition :
 * « Sauce tomate » est une sauce, « Yaourt fraise » un yaourt.
 */
const PREPARATIONS = new Set([
  'sauce', 'jus', 'nectar', 'soupe', 'veloute', 'potage', 'puree', 'confiture', 'compote', 'tarte', 'gateau', 'cake',
  'glace', 'sorbet', 'yaourt', 'chips', 'biscuit', 'smoothie', 'sirop', 'the', 'tisane', 'creme_dessert', 'creme_glacee',
]);

/** Qualificatifs sans valeur pour identifier l’aliment. */
const QUALIFIERS = new Set([
  'petit', 'gros', 'grand', 'mini', 'maxi', 'bio', 'frai', 'nature', 'entier', 'demi', 'extra', 'fin', 'leger', 'allege',
  'surgele', 'fraiche', 'fume', 'fumee', 'cuit', 'cuite', 'maison', 'classique', 'original', 'tradition', 'traditionnel', 'artisanal', 'fermier',
]);

const singularize = (word: string) => (word.length > 3 ? word.replace(/[sx]$/, '') : word);

/** « Pâté » (charcuterie) se distingue de « pâte » avant que les accents ne disparaissent. */
const PATE_CHARCUTERIE = /(^|[^\p{L}])p[âa]tés?(?=$|[^\p{L}])/giu;

/** Mots normalisés au singulier, noms composés réunis en un seul mot (« pomme_de_terre »). */
function words(name: string): string[] {
  const disambiguated = name.replace(PATE_CHARCUTERIE, (_match, before: string) => `${before}terrine`);
  let text = ` ${normalizeText(disambiguated)
    .replace(/[’'`]/g, ' ')
    .replace(/[^a-z0-9 -]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singularize)
    .join(' ')} `;
  for (const compound of COMPOUNDS) {
    text = text.replaceAll(` ${compound} `, ` ${compound.replace(/ /g, '_')} `);
  }
  return text.split(' ').filter((word) => word && !ARTICLES.has(word));
}

export interface FoodName {
  /** Mots du nom principal (l’aliment lui-même). */
  head: string[];
  /** Tous les mots significatifs, compléments compris. */
  all: string[];
}

function splitHead(tokens: string[]): string[] {
  const index = tokens.findIndex((word) => PREPOSITIONS.has(word));
  const head = index === -1 ? tokens : tokens.slice(0, index);
  const rest = index === -1 ? [] : tokens.slice(index + 1);
  if (head.length === 0) return rest.length > 0 ? splitHead(rest) : [];
  // « Filet de saumon », « petit pot de yaourt » : le contenant renvoie à l’aliment qui suit.
  const onlyForm = head.every((word) => FORM_WORDS.has(word) || QUALIFIERS.has(word));
  if (onlyForm && head.some((word) => FORM_WORDS.has(word)) && rest.length > 0) return splitHead(rest);
  const preparation = head.findIndex((word) => PREPARATIONS.has(word));
  if (preparation !== -1) return head.slice(0, preparation + 1);
  return head;
}

export function parseFoodName(name: string): FoodName {
  const tokens = words(name);
  return { head: splitHead(tokens), all: tokens.filter((word) => !PREPOSITIONS.has(word)) };
}

/** Mots porteurs de sens du nom principal, sans les qualificatifs (« petit », « bio »…). */
export function significantHead(name: string): string[] {
  return parseFoodName(name).head.filter((word) => !QUALIFIERS.has(word) && !/^\d/.test(word));
}

/** Forme normalisée d’un mot-clé (« pommes de terre » → ["pomme_de_terre"]). */
export function keywordTokens(keyword: string): string[] {
  return parseFoodName(keyword).all;
}

/** Vrai si la suite de mots `phrase` apparaît telle quelle dans `tokens`. */
export function containsPhrase(tokens: readonly string[], phrase: readonly string[]): boolean {
  if (phrase.length === 0 || phrase.length > tokens.length) return false;
  for (let start = 0; start <= tokens.length - phrase.length; start += 1) {
    if (phrase.every((word, offset) => tokens[start + offset] === word)) return true;
  }
  return false;
}

/** Le mot-clé désigne-t-il l’aliment principal du nom ? (« beurre » ✗ pour « Petits pains au beurre ») */
export function headMatches(name: string | FoodName, keyword: string | readonly string[]): boolean {
  const parsed = typeof name === 'string' ? parseFoodName(name) : name;
  const phrase = typeof keyword === 'string' ? keywordTokens(keyword) : keyword;
  return containsPhrase(parsed.head, phrase);
}
