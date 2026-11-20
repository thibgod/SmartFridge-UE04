import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { FOOD_IMAGES, type CatalogEntry } from '@/data/foodImages';
import type { ProductCategory } from '@/types/product';
import { headMatches, keywordTokens, parseFoodName, significantHead } from '@/utils/foodName';
import { normalizeText } from '@/utils/text';

/**
 * Illustrations automatiques. Ordre de résolution pour un produit sans photo Open Food Facts :
 *   1. catalogue local vérifié (data/foodImages) → aucune requête de recherche ;
 *   2. recherche Wikipédia (fr) sur le nom du produit, avec garde-fous de pertinence ;
 *   3. sinon : icône de catégorie (repli visuel, jamais d’image hors sujet).
 * Seul le nom du produit est envoyé ; aucune donnée personnelle.
 */

export const IMAGE_USER_AGENT = `SmartFridge/${Constants.expoConfig?.version ?? '1.0.0'} (application mobile anti-gaspi)`;
/**
 * Wikimedia demande d’identifier l’application. Un navigateur interdit de modifier le User-Agent
 * et un en-tête personnalisé déclencherait une requête CORS refusée : rien n’est ajouté sur le web.
 */
export const IMAGE_HEADERS: Record<string, string> | undefined =
  Platform.OS === 'web' ? undefined : { 'User-Agent': IMAGE_USER_AGENT };

const COMMONS_FILE_PATH = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
const WIKIPEDIA_API = 'https://fr.wikipedia.org/w/api.php';
const TIMEOUT_MS = 6000;

/** URL d’une vignette Wikimedia Commons à la largeur demandée (le serveur redirige vers la miniature). */
export function commonsThumbUrl(file: string, width = 480): string {
  return `${COMMONS_FILE_PATH}${encodeURIComponent(file)}?width=${width}`;
}

/** Clé de cache stable pour un nom de produit (version 2 : analyse du nom principal). */
export function imageCacheKey(name: string): string {
  const { all } = parseFoodName(name);
  // v3 : les images trouvées sans vérifier la description (v2) sont oubliées.
  return all.length > 0 ? `v3:${all.join(' ')}` : '';
}

/** Mots-clés du catalogue passés par la même normalisation que les noms de produits. */
const CATALOG = FOOD_IMAGES.map((entry) => ({ entry, keys: entry.keywords.map(keywordTokens) }));

/** Première entrée du catalogue qui correspond à l’aliment principal du nom. */
export function findCatalogEntry(name: string): CatalogEntry | null {
  const parsed = parseFoodName(name);
  if (parsed.head.length === 0) return null;
  return CATALOG.find(({ keys }) => keys.some((key) => headMatches(parsed, key)))?.entry ?? null;
}

/**
 * Photo vérifiée de l’aliment. null si l’aliment n’est pas au catalogue, ou s’il y est
 * sans photo (ex. « Confiture de fraises » : on ne montre pas des fraises).
 */
export function findCatalogImage(name: string, width = 480): string | null {
  const entry = findCatalogEntry(name);
  return entry?.file ? commonsThumbUrl(entry.file, width) : null;
}

/** L’aliment est-il reconnu par le catalogue (même sans photo) ? */
export function isKnownFood(name: string): boolean {
  return findCatalogEntry(name) !== null;
}

/** Catégorie probable d’après le nom (« Petits pains au beurre » → féculents), null si inconnue. */
export function guessCategory(name: string): ProductCategory | null {
  return findCatalogEntry(name)?.category ?? null;
}

/** Qualificatifs d’homonymie acceptés : « Moutarde (condiment) » oui, « Basilic (mythologie) » non. */
const ALLOWED_QUALIFIERS = [
  'aliment', 'cuisine', 'condiment', 'plante', 'fruit', 'legume', 'fromage', 'boeuf', 'viande',
  'poisson', 'plat', 'boisson', 'pate', 'gastronomie', 'patisserie', 'sauce', 'dessert',
];

interface WikiPage {
  title: string;
  index?: number;
  thumbnail?: { source: string };
  /** Description courte Wikidata (« fruit du bananier », « acteur australien »). */
  description?: string;
}

/**
 * Mots qui signalent un aliment dans la description courte d’une page. Sans eux, l’image est refusée :
 * un nom inconnu (« Chris », une faute de frappe) renverrait sinon la photo d’une personne ou d’une ville.
 */
const FOOD_DESCRIPTION = new RegExp(
  `\\b(${[
    'aliment', 'alimentaire', 'plat', 'mets', 'preparation', 'culinaire', 'cuisine', 'gastronomie', 'gastronomique', 'recette', 'specialite',
    'fruit', 'legume', 'potager', 'potagere', 'plante', 'espece', 'variete', 'cultivar', 'champignon', 'cereale', 'graine', 'noix',
    'fromage', 'lait', 'laitier', 'laitiere', 'yaourt', 'creme', 'beurre', 'oeuf', 'viande', 'charcuterie', 'volaille', 'poisson',
    'crustace', 'mollusque', 'fruits de mer', 'patisserie', 'gateau', 'dessert', 'biscuit', 'confiserie', 'chocolat',
    'pain', 'viennoiserie', 'pate', 'pates', 'riz', 'farine', 'sucre', 'sauce', 'condiment', 'epice', 'aromatique',
    'soupe', 'boisson', 'jus', 'vin', 'biere', 'alcool', 'liqueur', 'cafe', 'the', 'huile', 'conserve', 'en-cas',
  ].join('|')})(s|x)?\\b`,
);

export function isFoodDescription(description: string | undefined): boolean {
  return !!description && FOOD_DESCRIPTION.test(normalizeText(description));
}

/**
 * Une page est retenue seulement si son titre commence par l’aliment principal recherché
 * (« Gaz moutarde » est rejeté pour « Moutarde ») et sans homonymie hors cuisine.
 */
export function isRelevantPage(query: string, title: string): boolean {
  const queryHead = new Set(significantHead(query));
  const match = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(title);
  const mainTitle = match ? (match[1] ?? title) : title;
  const qualifier = match ? normalizeText(match[2] ?? '') : null;
  if (qualifier && !ALLOWED_QUALIFIERS.some((allowed) => qualifier.includes(allowed))) return false;
  // Le titre doit désigner l’aliment principal recherché : « Beurre » est rejeté pour « Petits pains au beurre ».
  const [first] = significantHead(mainTitle);
  return first !== undefined && queryHead.has(first);
}

export function pickRelevantImage(query: string, pages: readonly WikiPage[]): string | null {
  const ordered = [...pages].sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
  const page = ordered.find((p) => p.thumbnail?.source && isRelevantPage(query, p.title) && isFoodDescription(p.description));
  return page?.thumbnail?.source ?? null;
}

export type LookupOutcome = { status: 'found'; url: string } | { status: 'none' } | { status: 'error' };

export async function searchWikipediaImage(name: string): Promise<LookupOutcome> {
  const params = new URLSearchParams({
    action: 'query',
    generator: 'search',
    gsrsearch: name,
    gsrlimit: '5',
    gsrnamespace: '0',
    prop: 'pageimages|description',
    piprop: 'thumbnail',
    pithumbsize: '480',
    format: 'json',
    formatversion: '2',
    origin: '*',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${WIKIPEDIA_API}?${params.toString()}`, {
      headers: { ...(IMAGE_HEADERS ?? {}), Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) return { status: 'error' };
    const data = (await response.json()) as { query?: { pages?: WikiPage[] } };
    const url = pickRelevantImage(name, data.query?.pages ?? []);
    return url ? { status: 'found', url } : { status: 'none' };
  } catch {
    return { status: 'error' };
  } finally {
    clearTimeout(timer);
  }
}
