import type { Palette } from './tokens';

/**
 * Couleurs d’accent (personnalisation Premium). Seul le rôle « primary » change : boutons,
 * liens, onglet actif, pastilles. Les couleurs de sens (périmé, urgent, consommé) restent fixes
 * pour que l’état d’un produit se lise toujours de la même façon.
 */

export type AccentId = 'foret' | 'ocean' | 'framboise' | 'prune' | 'terracotta';

type AccentRoles = Pick<Palette, 'primary' | 'primaryPressed' | 'primarySoft' | 'onPrimary'>;

interface Accent {
  label: string;
  light: AccentRoles;
  dark: AccentRoles;
}

export const ACCENTS: Record<AccentId, Accent> = {
  foret: {
    label: 'Forêt',
    light: { primary: '#2F6B4F', primaryPressed: '#245540', primarySoft: '#E2EEE6', onPrimary: '#FFFFFF' },
    dark: { primary: '#72C79F', primaryPressed: '#5FB58C', primarySoft: '#1C3529', onPrimary: '#0A1D13' },
  },
  ocean: {
    label: 'Océan',
    light: { primary: '#1F5F8B', primaryPressed: '#184C70', primarySoft: '#E1ECF5', onPrimary: '#FFFFFF' },
    dark: { primary: '#7DBBE8', primaryPressed: '#66A9DA', primarySoft: '#16293A', onPrimary: '#06182A' },
  },
  framboise: {
    label: 'Framboise',
    light: { primary: '#A32A55', primaryPressed: '#872245', primarySoft: '#F7E3EA', onPrimary: '#FFFFFF' },
    dark: { primary: '#F29BB8', primaryPressed: '#E886A7', primarySoft: '#3A1B27', onPrimary: '#2A0814' },
  },
  prune: {
    label: 'Prune',
    light: { primary: '#5E3F8F', primaryPressed: '#4C3275', primarySoft: '#ECE5F5', onPrimary: '#FFFFFF' },
    dark: { primary: '#C2A6EE', primaryPressed: '#B193E4', primarySoft: '#2A2140', onPrimary: '#170D2B' },
  },
  terracotta: {
    label: 'Terracotta',
    light: { primary: '#9C4523', primaryPressed: '#80381C', primarySoft: '#F6E6DE', onPrimary: '#FFFFFF' },
    dark: { primary: '#F0A37F', primaryPressed: '#E6906A', primarySoft: '#3A2318', onPrimary: '#2A1206' },
  },
};

export const ACCENT_ORDER: readonly AccentId[] = ['foret', 'ocean', 'framboise', 'prune', 'terracotta'];
export const DEFAULT_ACCENT: AccentId = 'foret';

export function isAccentId(value: unknown): value is AccentId {
  return typeof value === 'string' && value in ACCENTS;
}

/**
 * Accent réellement affiché : le choix n’est appliqué qu’avec Premium. Il reste enregistré à la fin
 * de l’abonnement et revient au réabonnement.
 */
export function resolveAccent(choice: unknown, isPremium: boolean): AccentId {
  return isPremium && isAccentId(choice) ? choice : DEFAULT_ACCENT;
}

export function applyAccent(base: Palette, accent: AccentId, isDark: boolean): Palette {
  if (accent === DEFAULT_ACCENT) return base;
  return { ...base, ...(isDark ? ACCENTS[accent].dark : ACCENTS[accent].light) };
}

function luminance(hex: string): number {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapport de contraste WCAG entre deux couleurs « #RRGGBB » (1 à 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
