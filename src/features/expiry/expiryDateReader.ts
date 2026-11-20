import type { LocalDateString } from '@/types/product';
import { addDays, daysBetween, isValidLocalDate } from '@/utils/date';
import { normalizeText } from '@/utils/text';

export type DateKind = 'dlc' | 'ddm';

export interface ReadExpiryDate {
  date: LocalDateString;
  /** DLC « à consommer jusqu’au » ou DDM « de préférence avant », si l’emballage le précise. */
  kind: DateKind | null;
}

const MONTHS: Record<string, number> = {
  janv: 1, janvier: 1, jan: 1, fevr: 2, fevrier: 2, fev: 2, feb: 2, mars: 3, mar: 3, avr: 4, avril: 4, apr: 4,
  mai: 5, may: 5, juin: 6, jun: 6, juil: 7, juillet: 7, jul: 7, aout: 8, aug: 8, sept: 9, septembre: 9, sep: 9,
  oct: 10, octobre: 10, nov: 11, novembre: 11, dec: 12, decembre: 12,
};

const DLC_WORDS = /\b(a consommer jusqu|jusqu.?au|dlc|use by|exp)/;
const DDM_WORDS = /\b(de preference|ddm|dluo|best before|bbe|a consommer avant)/;
const EXPIRY_WORDS = /\b(consommer|dlc|ddm|dluo|exp|avant|jusqu|best before|use by|bbe|fin)/;
const OTHER_DATE_WORDS = /\b(fab|fabrique|fabrication|emb|emballe|production|prod|lot|abattu|peche le|conditionne)/;

const pad = (n: number) => String(n).padStart(2, '0');
const fullYear = (y: string) => (y.length === 2 ? 2000 + Number(y) : Number(y));

function toDate(year: number, month: number, day: number | 'end'): LocalDateString | null {
  if (month < 1 || month > 12) return null;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const d = day === 'end' ? lastDay : day;
  const value = `${year}-${pad(month)}-${pad(d)}`;
  return isValidLocalDate(value) ? value : null;
}

const MONTH_PATTERN = new RegExp(
  `\\b(?:(\\d{1,2})\\s*)?(${Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|')})[a-z]*\\.?\\s*(20\\d{2}|\\d{2})\\b`,
  'g',
);

interface FoundDate {
  index: number;
  date: LocalDateString;
}

/** Toutes les dates plausibles d’une ligne, avec leur position. */
function datesInLine(line: string): FoundDate[] {
  const found: FoundDate[] = [];
  const add = (index: number, date: LocalDateString | null) => {
    if (date) found.push({ index, date });
  };
  const used: [number, number][] = [];
  const free = (start: number, end: number) => used.every(([s, e]) => end <= s || start >= e);
  const take = (match: RegExpExecArray) => used.push([match.index, match.index + match[0].length]);

  for (const m of line.matchAll(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/g)) {
    add(m.index, toDate(Number(m[1]), Number(m[2]), Number(m[3])));
    take(m as RegExpExecArray);
  }
  for (const m of line.matchAll(/\b(\d{1,2})[/.\- ](\d{1,2})[/.\- ](20\d{2}|\d{2})\b/g)) {
    if (!free(m.index, m.index + m[0].length)) continue;
    add(m.index, toDate(fullYear(m[3] ?? ''), Number(m[2]), Number(m[1])));
    take(m as RegExpExecArray);
  }
  for (const m of line.matchAll(MONTH_PATTERN)) {
    const month = MONTHS[m[2] ?? ''];
    if (!month || !free(m.index, m.index + m[0].length)) continue;
    add(m.index, toDate(fullYear(m[3] ?? ''), month, m[1] ? Number(m[1]) : 'end'));
    take(m as RegExpExecArray);
  }
  // « fin 10/2027 » ou « 10/2027 » : dernier jour du mois.
  for (const m of line.matchAll(/\b(\d{1,2})[/.\-](20\d{2})\b/g)) {
    if (!free(m.index, m.index + m[0].length)) continue;
    add(m.index, toDate(Number(m[2]), Number(m[1]), 'end'));
  }
  return found.sort((a, b) => a.index - b.index);
}

/**
 * Trouve la date de péremption dans le texte lu sur un emballage. Les dates proches
 * des mentions DLC / DDM sont privilégiées, celles de fabrication ou d’emballage écartées ;
 * à défaut, la date valide la plus lointaine l’emporte (la fabrication précède la péremption).
 */
export function findExpiryDate(texts: readonly string[], today: LocalDateString): ReadExpiryDate | null {
  const lines = texts.flatMap((text) => text.split(/\n+/)).map(normalizeText).filter(Boolean);
  const candidates: { date: LocalDateString; score: number; kind: DateKind | null }[] = [];

  lines.forEach((line, i) => {
    const context = `${lines[i - 1] ?? ''} ${line}`;
    for (const { index, date } of datesInLine(line)) {
      const offset = daysBetween(today, date);
      if (offset < -60 || date > addDays(today, 365 * 6)) continue;
      // Seuls les mots entre le nombre précédent et la date la qualifient (« EMB 12/10 DLC 25/10 »).
      const lead = line.slice(Math.max(0, index - 30), index).split(/\d[\d/.-]*\s*/).pop() ?? '';
      let score = 0;
      if (EXPIRY_WORDS.test(lead)) score += 10;
      else if (EXPIRY_WORDS.test(context)) score += 5;
      if (OTHER_DATE_WORDS.test(lead)) score -= 20;
      const kind: DateKind | null = DDM_WORDS.test(context) ? 'ddm' : DLC_WORDS.test(context) ? 'dlc' : null;
      candidates.push({ date, score, kind });
    }
  });

  const best = candidates.sort((a, b) => b.score - a.score || b.date.localeCompare(a.date))[0];
  return best && best.score > -20 ? { date: best.date, kind: best.kind } : null;
}
