import type { ProductCategory } from '@/types/product';

/**
 * Règles de correspondance entre les categories_tags Open Food Facts (« en:yogurts »)
 * et les catégories internes. L’ordre compte : les plats préparés sont testés avant
 * la viande (« en:meals-with-meat »), les produits laitiers avant les desserts, etc.
 */
const RULES: readonly { category: ProductCategory; patterns: RegExp[] }[] = [
  {
    // Garde-fou : sauces, boissons et sucreries ne doivent pas tomber dans « fruits » ou « laitiers ».
    category: 'autre',
    patterns: [
      /sauces?\b/,
      /condiments?/,
      /beverages?|drinks?|juices?|sodas?|waters?\b/,
      /snacks?/,
      /confectioner|chocolates?|candies|sweets\b/,
      /spreads?\b|jams?\b|honeys?\b/,
    ],
  },
  {
    category: 'plats_prepares',
    patterns: [
      /meals?\b/,
      /prepared/,
      /pizzas?/,
      /sandwich/,
      /soups?/,
      /quiches?/,
      /lasagn/,
      /ready-to-eat/,
      /salads-ready|mixed-salads|composed-salads/,
      /tarts?-salees|savory-pies|savoury-pies/,
    ],
  },
  {
    category: 'viande_poisson',
    patterns: [
      /meats?\b/,
      /poultr/,
      /chickens?/,
      /beef/,
      /pork/,
      /hams?\b/,
      /sausages?/,
      /charcuter/,
      /fish/,
      /seafood/,
      /salmon/,
      /tuna/,
      /shrimps?|prawns?/,
    ],
  },
  {
    category: 'produits_laitiers',
    patterns: [/dair/, /milks?\b/, /cheeses?/, /yogh?urts?/, /butters?\b/, /creams?\b/, /fromages?/, /desserts-lactes|dairy-desserts/],
  },
  {
    category: 'fruits_legumes',
    patterns: [/fruits?\b/, /vegetables?/, /legumes-frais/, /salads?\b/, /berries/, /apples?/, /tomato/, /compotes?/],
  },
  {
    category: 'feculents',
    patterns: [
      /pastas?\b/,
      /rices?\b/,
      /breads?\b/,
      /cereals?/,
      /potato/,
      /flours?/,
      /semolina|couscous/,
      /legumes\b|pulses|lentils|beans/,
      /noodles/,
      /biscottes|crackers/,
    ],
  },
];

/** Retire le préfixe de langue (« en: », « fr: ») d’un tag. */
const stripLanguage = (tag: string) => tag.replace(/^[a-z]{2,3}:/, '').toLowerCase();

export function mapOffCategories(tags: unknown): ProductCategory {
  if (!Array.isArray(tags)) return 'autre';
  const cleaned = tags.filter((t): t is string => typeof t === 'string').map(stripLanguage);
  if (cleaned.length === 0) return 'autre';

  // Les tags OFF vont du plus général au plus précis : on part du plus précis.
  for (const tag of [...cleaned].reverse()) {
    for (const rule of RULES) {
      if (rule.patterns.some((pattern) => pattern.test(tag))) return rule.category;
    }
  }
  return 'autre';
}
