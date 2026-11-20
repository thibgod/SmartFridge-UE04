import { FOOD_IMAGES, RECIPE_IMAGES, TIP_IMAGES } from '@/data/foodImages';
import { IMAGE_CREDITS } from '@/data/imageCredits';
import { RECIPES } from '@/data/recipes';
import { TIPS } from '@/data/tips';
import type { ImageCredit } from '@/types/content';

export interface PhotoCreditEntry {
  file: string;
  /** Ce que la photo illustre dans l’app (« Tomate », « Recette : Ratatouille »). */
  usages: string[];
  credit: ImageCredit | null;
}

const normalizeFile = (file: string) => file.replace(/_/g, ' ').trim();
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Toutes les photos embarquées, avec leur usage et leur crédit, triées par usage. */
export function listPhotoCredits(): PhotoCreditEntry[] {
  const byFile = new Map<string, string[]>();
  const add = (file: string | undefined, usage: string) => {
    if (!file) return;
    const key = normalizeFile(file);
    const usages = byFile.get(key) ?? [];
    if (!usages.includes(usage)) usages.push(usage);
    byFile.set(key, usages);
  };

  for (const entry of FOOD_IMAGES) add(entry.file, capitalize(entry.keywords[0] ?? 'Aliment'));
  for (const recipe of RECIPES) add(RECIPE_IMAGES[recipe.id], `Recette : ${recipe.title}`);
  for (const tip of TIPS) add(TIP_IMAGES[tip.id], `Conseil : ${tip.title}`);

  return [...byFile.entries()]
    .map(([file, usages]) => ({ file, usages, credit: IMAGE_CREDITS[file] ?? null }))
    .sort((a, b) => (a.usages[0] ?? '').localeCompare(b.usages[0] ?? '', 'fr'));
}
