import type { ProductCategory } from '@/types/product';

/** Conseil ciblé selon la catégorie la plus gaspillée (écran Statistiques). */
export const WASTE_ADVICE: Record<ProductCategory, string> = {
  fruits_legumes:
    'Fruits et légumes trop mûrs ? Soupes, compotes et smoothies les sauvent. Les bananes tachetées se congèlent en morceaux.',
  viande_poisson:
    'Viande et poisson se congèlent très bien avant la date : congelez-les dès que vous savez que vous ne les cuisinerez pas à temps.',
  produits_laitiers:
    'Yaourts, crème et fromages entamés se gardent peu : prévoyez un gratin, une quiche ou un smoothie dans les 2 jours.',
  feculents:
    'Riz et pâtes cuits se gardent 3 jours au frigo : un riz sauté ou une salade composée les écoule facilement.',
  plats_prepares:
    'Les restes de plats cuisinés se congèlent en portions : idéal pour un déjeuner sans gaspillage.',
  autre: 'Faites le point sur vos placards avant les courses : vous éviterez les doublons qui finissent oubliés.',
};
