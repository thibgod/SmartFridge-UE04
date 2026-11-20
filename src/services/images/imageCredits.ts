import { IMAGE_CREDITS } from '@/data/imageCredits';
import type { ImageCredit } from '@/types/content';

import { IMAGE_HEADERS } from './foodImages';

/**
 * Crédits des photos affichées. Les licences libres (CC BY, CC BY-SA) imposent de citer l’auteur
 * et la licence : on le fait sous chaque photo affichée en grand et dans « Crédits et licences ».
 *   - photos du catalogue : crédits embarqués (scripts/fetch-image-credits.mjs) ;
 *   - illustrations trouvées sur Wikipédia : crédits demandés à l’API au premier affichage ;
 *   - photos Open Food Facts : crédit global des contributeurs (CC BY-SA) ;
 *   - photos personnelles : rien à créditer.
 */

export type PhotoSource =
  { kind: 'wikimedia'; wiki: 'commons' | 'fr'; file: string } | { kind: 'openfoodfacts' } | { kind: 'none' };

export const OPEN_FOOD_FACTS_CREDIT: ImageCredit = {
  author: 'Contributeurs Open Food Facts',
  license: 'CC BY-SA 3.0',
  licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/deed.fr',
  page: 'https://world.openfoodfacts.org',
};

const normalizeFile = (file: string) => file.replace(/_/g, ' ').trim();

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** D’où vient une image, d’après son adresse. */
export function photoSource(uri: string | null | undefined): PhotoSource {
  if (!uri) return { kind: 'none' };
  const filePath = uri.match(/\/wiki\/Special:FilePath\/([^?#]+)/);
  if (filePath?.[1]) return { kind: 'wikimedia', wiki: 'commons', file: normalizeFile(decode(filePath[1])) };
  // upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Fichier.jpg/480px-Fichier.jpg (ou sans /thumb/)
  const upload = uri.match(/upload\.wikimedia\.org\/wikipedia\/(commons|fr)\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/);
  if (upload?.[1] && upload[2]) {
    return { kind: 'wikimedia', wiki: upload[1] === 'fr' ? 'fr' : 'commons', file: normalizeFile(decode(upload[2])) };
  }
  if (/openfoodfacts\.(org|net)\//.test(uri)) return { kind: 'openfoodfacts' };
  return { kind: 'none' };
}

/** Page de la photo sur Wikimedia, utile même quand le crédit détaillé n’a pas pu être lu (hors ligne). */
export function filePageUrl(source: Extract<PhotoSource, { kind: 'wikimedia' }>): string {
  const host = source.wiki === 'fr' ? 'https://fr.wikipedia.org' : 'https://commons.wikimedia.org';
  return `${host}/wiki/Fichier:${encodeURIComponent(source.file.replace(/ /g, '_'))}`;
}

/** Crédit connu sans réseau (catalogue embarqué ou Open Food Facts). */
export function knownCredit(source: PhotoSource): ImageCredit | null {
  if (source.kind === 'openfoodfacts') return OPEN_FOOD_FACTS_CREDIT;
  if (source.kind === 'wikimedia') return IMAGE_CREDITS[source.file] ?? null;
  return null;
}

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, '’')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Nom d’auteur lisible : sans e-mail ni formule automatique de Commons, raccourci au besoin. */
export function cleanAuthor(raw: string): string {
  let author = stripHtml(raw)
    .replace(/^No machine-readable author provided\.\s*/i, '')
    .replace(/\s*assumed \(based on copyright claims\)\.?/i, '')
    .replace(/\S+\s*\[at\]\s*\S+/gi, '')
    .replace(/\S+@\S+/g, '')
    .replace(/^by\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\s.,;:]+$/, '');
  if (author.length > 60) author = `${author.slice(0, 57).trim()}…`;
  return author;
}

const TIMEOUT_MS = 6000;
const remote = new Map<string, Promise<ImageCredit | null>>();

/** Crédit d’une illustration Wikipédia hors catalogue, lu une fois par session puis gardé en mémoire. */
export function fetchCredit(source: Extract<PhotoSource, { kind: 'wikimedia' }>): Promise<ImageCredit | null> {
  const key = `${source.wiki}:${source.file}`;
  const pending = remote.get(key);
  if (pending) return pending;

  const task = (async () => {
    const api = source.wiki === 'fr' ? 'https://fr.wikipedia.org/w/api.php' : 'https://commons.wikimedia.org/w/api.php';
    const params = new URLSearchParams({
      action: 'query',
      titles: `File:${source.file}`,
      prop: 'imageinfo',
      iiprop: 'extmetadata|url',
      iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl',
      format: 'json',
      formatversion: '2',
      origin: '*',
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(`${api}?${params.toString()}`, {
        headers: { ...(IMAGE_HEADERS ?? {}), Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) return null;
      const data = (await response.json()) as {
        query?: { pages?: { imageinfo?: { descriptionurl?: string; extmetadata?: Record<string, { value?: string }> }[] }[] };
      };
      const info = data.query?.pages?.[0]?.imageinfo?.[0];
      const meta = info?.extmetadata;
      if (!meta) return null;
      return {
        author: cleanAuthor(meta.Artist?.value ?? '') || 'Auteur inconnu',
        license: stripHtml(meta.LicenseShortName?.value ?? ''),
        ...(meta.LicenseUrl?.value ? { licenseUrl: meta.LicenseUrl.value } : {}),
        page: info?.descriptionurl ?? filePageUrl(source),
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  })();
  // Un échec (hors ligne) n’est pas mémorisé : on retentera au prochain affichage.
  task.then((credit) => credit ?? remote.delete(key)).catch(() => remote.delete(key));
  remote.set(key, task);
  return task;
}

/**
 * « © Rainer Zenz · CC BY-SA 3.0 », « USDA · domaine public », « Benoît Prieur · CC0 ».
 * Le « © » n’accompagne que les licences qui gardent un droit d’auteur ; la licence est omise si inconnue.
 */
export function formatCredit(credit: ImageCredit): string {
  if (!credit.license) return credit.author;
  const freeOfRights = /^(public domain|CC0)/i.test(credit.license);
  const license = /^public domain$/i.test(credit.license) ? 'domaine public' : credit.license;
  return `${freeOfRights ? '' : '© '}${credit.author} · ${license}`;
}
