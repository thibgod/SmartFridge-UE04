#!/usr/bin/env node
/**
 * Régénère src/data/imageCredits.ts : auteur et licence de chaque photo Wikimedia Commons
 * citée dans src/data/foodImages.ts (aliments, recettes, conseils).
 *
 *   node scripts/fetch-image-credits.mjs
 *
 * À relancer après tout ajout ou changement de photo. Le script échoue si une photo n’a pas
 * de licence libre identifiable : elle ne doit pas être publiée sans crédit.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = readFileSync(join(root, 'src/data/foodImages.ts'), 'utf8');
const output = join(root, 'src/data/imageCredits.ts');

// « file: 'X.jpg' » dans le catalogue et « clé: 'X.jpg' » dans les tables recettes / conseils.
const files = new Set();
// Guillemets simples ou doubles (« Crème d'Isigny 2.JPG » contient une apostrophe).
for (const pattern of [/'([^'\n]+\.(?:jpe?g|png|webp|gif))'/gi, /"([^"\n]+\.(?:jpe?g|png|webp|gif))"/gi]) {
  for (const match of source.matchAll(pattern)) files.add(match[1]);
}

const normalize = (file) => file.replace(/_/g, ' ').trim();
const stripHtml = (html) =>
  html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&#39;/g, '’')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Nom d’auteur lisible : sans e-mail, matériel photo ni formule automatique de Commons. */
const cleanAuthor = (raw) => {
  let author = raw
    .replace(/^No machine-readable author provided\.\s*/i, '')
    .replace(/\s*assumed \(based on copyright claims\)\.?/i, '')
    .replace(/\S+\s*\[at\]\s*\S+/gi, '')
    .replace(/\S+@\S+/g, '')
    .replace(/\b(Canon|Nikon|Sony|Sigma)\b.*$/i, '')
    .replace(/^by\s+/i, '')
    .replace(/["“].*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\s.,;:]+$/, '');
  if (author.length > 60) author = `${author.slice(0, 57).trim()}…`;
  return author || 'Auteur inconnu';
};

const USER_AGENT = 'SmartFridge/1.0 (script de crédits photo ; application mobile anti-gaspi)';

async function fetchBatch(batch) {
  const params = new URLSearchParams({
    action: 'query',
    titles: batch.map((file) => `File:${file}`).join('|'),
    prop: 'imageinfo',
    iiprop: 'extmetadata|url',
    iiextmetadatafilter: 'Artist|LicenseShortName|LicenseUrl|UsageTerms|Credit',
    format: 'json',
    formatversion: '2',
  });
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) throw new Error(`Commons a répondu ${response.status}`);
  return response.json();
}

const credits = {};
const problems = [];
const list = [...files];
for (let i = 0; i < list.length; i += 40) {
  const data = await fetchBatch(list.slice(i, i + 40));
  for (const page of data.query?.pages ?? []) {
    const file = page.title.replace(/^File:/, '');
    const meta = page.imageinfo?.[0]?.extmetadata;
    if (page.missing || !meta) {
      problems.push(`${file} : introuvable sur Commons`);
      continue;
    }
    const license = stripHtml(meta.LicenseShortName?.value ?? meta.UsageTerms?.value ?? '');
    const author = cleanAuthor(stripHtml(meta.Artist?.value ?? ''));
    if (!license) problems.push(`${file} : licence absente`);
    // La GFDL impose de joindre son texte intégral : inadaptée à une app, la photo doit être remplacée.
    if (/GFDL/i.test(license)) problems.push(`${file} : licence GFDL seule, à remplacer`);
    credits[normalize(file)] = {
      author,
      license,
      ...(meta.LicenseUrl?.value ? { licenseUrl: meta.LicenseUrl.value } : {}),
      page: page.imageinfo[0].descriptionurl,
    };
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}

const sorted = Object.fromEntries(Object.entries(credits).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(
  output,
  `// Fichier généré par scripts/fetch-image-credits.mjs : ne pas modifier à la main.
import type { ImageCredit } from '@/types/content';

/** Auteur et licence des photos Wikimedia Commons du catalogue, par nom de fichier (espaces, sans « File: »). */
export const IMAGE_CREDITS: Readonly<Record<string, ImageCredit>> = ${JSON.stringify(sorted, null, 2)};
`,
);
console.log(`${Object.keys(sorted).length} crédits écrits dans src/data/imageCredits.ts`);
