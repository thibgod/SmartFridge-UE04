import type { IconName, RecipeTag } from '@/types/content';

export const RECIPE_TAGS: Record<RecipeTag, { label: string; icon: IconName }> = {
  vegetarien: { label: 'Végétarien', icon: 'leaf-outline' },
  'sans-four': { label: 'Sans four', icon: 'flame-outline' },
  dessert: { label: 'Dessert', icon: 'ice-cream-outline' },
  enfants: { label: 'Enfants', icon: 'happy-outline' },
  batch: { label: 'Se congèle', icon: 'snow-outline' },
};
