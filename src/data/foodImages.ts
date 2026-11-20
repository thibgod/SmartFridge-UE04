/**
 * Photos d’illustration issues de Wikimedia Commons (licences libres), choisies et vérifiées
 * une à une pour les aliments courants, les recettes et les conseils.
 * Le nom de fichier sert à construire l’URL de la vignette (voir services/images).
 * Pour un produit absent de ce catalogue, une recherche Wikipédia prend le relais.
 */

import type { ProductCategory } from '@/types/product';

export interface CatalogEntry {
  /**
   * Mots-clés reconnus dans le **nom principal** du produit (voir utils/foodName) :
   * « beurre » reconnaît « Beurre doux » mais pas « Petits pains au beurre ».
   */
  keywords: string[];
  /** Catégorie proposée automatiquement quand l’utilisateur tape ce nom. */
  category: ProductCategory;
  /** Fichier sur Wikimedia Commons ; absent = pas de photo vérifiée, la recherche Wikipédia prend le relais. */
  file?: string;
}

/**
 * Aliments : la première entrée reconnue l’emporte. Les noms composés (« pomme de terre »,
 * « pâte à tartiner », « lait de coco »…) sont des mots à part entière et ne se confondent
 * pas avec « pomme », « pâte » ou « lait ».
 */
export const FOOD_IMAGES: readonly CatalogEntry[] = [
  // Noms composés et produits transformés, avant leurs ingrédients
  { keywords: ['pomme de terre', 'patate', 'patate douce'], category: 'feculents', file: 'Patates.jpg' },
  { keywords: ['pate a tartiner', 'confiture', 'miel', 'chocolat', 'nutella'], category: 'autre' },
  { keywords: ['salade de fruit'], category: 'fruits_legumes' },
  { keywords: ['pain au chocolat', 'pain aux raisin', 'croissant', 'viennoiserie', 'brioche'], category: 'feculents' },
  { keywords: ['riz au lait', 'creme dessert', 'creme brulee', 'creme caramel', 'creme anglaise', 'dessert', 'flan', 'mousse', 'liegeois'], category: 'produits_laitiers' },
  { keywords: ['pate brisee', 'pate feuilletee', 'pate sablee', 'pate a pizza', 'pate a crepe'], category: 'autre' },
  { keywords: ['creme glacee'], category: 'autre' },
  { keywords: ['lait de coco', 'lait d amande', 'lait d avoine', 'lait de soja', 'creme de soja'], category: 'autre' },
  { keywords: ['sauce', 'ketchup', 'mayonnaise', 'moutarde', 'pesto', 'vinaigrette'], category: 'autre' },
  { keywords: ['jus', 'nectar'], category: 'autre', file: 'Orange_juice_1.jpg' },
  { keywords: ['soda', 'eau', 'biere', 'vin', 'cafe', 'the', 'sirop'], category: 'autre' },
  { keywords: ['chips', 'biscuit', 'gateau', 'cookie', 'bonbon', 'glace', 'cereale'], category: 'autre' },
  { keywords: ['pizza', 'tarte', 'tourte', 'houmous', 'taboule', 'sandwich', 'wrap', 'nem', 'sushi'], category: 'plats_prepares' },
  { keywords: ['fruit de mer'], category: 'viande_poisson', file: 'Cooked shrimp on a plate.jpg' },
  { keywords: ['salade composee', 'salade de pate', 'salade de riz', 'salade de lentille', 'salade de pomme de terre', 'salade nicoise'], category: 'plats_prepares' },
  // Fruits et légumes
  { keywords: ['petit poi'], category: 'fruits_legumes', file: 'Peas.jpg' },
  { keywords: ['haricot vert', 'haricot'], category: 'fruits_legumes', file: 'Haricots verts01.jpg' },
  { keywords: ['banane'], category: 'fruits_legumes', file: 'Banana_on_black_background.jpg' },
  { keywords: ['pomme'], category: 'fruits_legumes', file: 'Red Apple.jpg' },
  { keywords: ['poire'], category: 'fruits_legumes', file: 'Pears.jpg' },
  { keywords: ['fraise'], category: 'fruits_legumes', file: 'Garden_strawberry_(Fragaria_×_ananassa)_single2.jpg' },
  { keywords: ['orange', 'clementine', 'mandarine'], category: 'fruits_legumes', file: 'Oranges_-_whole-halved-segment.jpg' },
  { keywords: ['citron'], category: 'fruits_legumes', file: 'Lemon.jpg' },
  { keywords: ['raisin'], category: 'fruits_legumes', file: 'Grapes,_Rostov-on-Don,_Russia.jpg' },
  { keywords: ['kiwi'], category: 'fruits_legumes', file: 'Kiwi (Actinidia chinensis) 1 Luc Viatour.jpg' },
  { keywords: ['abricot'], category: 'fruits_legumes', file: 'Apricots-824626.jpg' },
  { keywords: ['prune'], category: 'fruits_legumes', file: 'Plums_African_Rose_-_whole,_halved_and_slice.jpg' },
  { keywords: ['mangue'], category: 'fruits_legumes', file: 'Mangos_-_single_and_halved.jpg' },
  { keywords: ['avocat'], category: 'fruits_legumes', file: 'Avocado Hass - single and halved.jpg' },
  { keywords: ['tomate'], category: 'fruits_legumes', file: 'Tomato je.jpg' },
  { keywords: ['courgette'], category: 'fruits_legumes', file: 'Zucchini-Whole.jpg' },
  { keywords: ['aubergine'], category: 'fruits_legumes', file: 'Aubergine.jpg' },
  { keywords: ['carotte'], category: 'fruits_legumes', file: 'Carrots_on_Display.jpg' },
  { keywords: ['poivron'], category: 'fruits_legumes', file: 'Green-Yellow-Red-Pepper-2009.jpg' },
  { keywords: ['concombre'], category: 'fruits_legumes', file: 'Slicing cucumber (5442160654).jpg' },
  { keywords: ['salade', 'laitue', 'roquette', 'mache'], category: 'fruits_legumes', file: 'Romaine lettuce.jpg' },
  { keywords: ['epinard'], category: 'fruits_legumes', file: 'Spinach leaves.jpg' },
  { keywords: ['poireau'], category: 'fruits_legumes', file: 'Leek_on_white_background_-_0947.jpg' },
  { keywords: ['brocoli'], category: 'fruits_legumes', file: 'Fire-Tuscarora Organic Growers - Broccoli head.jpg' },
  { keywords: ['chou-fleur', 'chou fleur'], category: 'fruits_legumes', file: 'Chou-fleur_02.jpg' },
  { keywords: ['chou'], category: 'fruits_legumes', file: 'Brassica oleracea var. capitata (4170722993).jpg' },
  { keywords: ['oignon', 'echalote', 'ail'], category: 'fruits_legumes', file: 'Mixed_onions.jpg' },
  { keywords: ['champignon'], category: 'fruits_legumes', file: '2016-01 Agaricus bisporus 01.jpg' },
  { keywords: ['compote'], category: 'fruits_legumes', file: 'Apple-sauce-544676.jpg' },
  { keywords: ['fruits rouge', 'myrtille', 'framboise', 'cerise'], category: 'fruits_legumes', file: 'Frozen_berries_(35379207760).jpg' },
  { keywords: ['fruit', 'legume', 'melon', 'pasteque', 'ananas', 'peche', 'nectarine', 'betterave', 'navet', 'radis', 'celeri', 'fenouil', 'endive', 'potiron', 'courge', 'asperge', 'artichaut', 'herbe', 'persil', 'basilic', 'coriandre', 'ciboulette'], category: 'fruits_legumes' },
  // Viande et poisson
  { keywords: ['poulet', 'escalope', 'dinde', 'volaille', 'canard', 'pintade'], category: 'viande_poisson', file: 'Raw chicken slices.jpg' },
  { keywords: ['jambon'], category: 'viande_poisson', file: 'Jambon_blanc_de_Paris.png' },
  { keywords: ['lardon', 'bacon'], category: 'viande_poisson', file: 'Made20bacon.png' },
  { keywords: ['viande hachee', 'steak hache', 'hache', 'boeuf', 'steak', 'bavette', 'entrecote'], category: 'viande_poisson', file: 'Hackfleisch-1.jpg' },
  { keywords: ['saucisse', 'saucisson', 'charcuterie', 'chorizo', 'merguez', 'rillette', 'terrine'], category: 'viande_poisson', file: 'Wurstplatte.jpg' },
  { keywords: ['saumon'], category: 'viande_poisson', file: 'Raw salmon fillets.jpg' },
  { keywords: ['thon'], category: 'viande_poisson', file: 'Lata de atún-Albo.jpg' },
  { keywords: ['crevette', 'gambas'], category: 'viande_poisson', file: 'Cooked shrimp on a plate.jpg' },
  { keywords: ['cote de boeuf', 'cote de porc', 'porc', 'veau', 'agneau', 'roti', 'cote', 'viande', 'poisson', 'cabillaud', 'colin', 'merlu', 'sardine', 'maquereau', 'truite', 'moule', 'surimi'], category: 'viande_poisson' },
  // Produits laitiers et œufs
  { keywords: ['creme fraiche', 'creme'], category: 'produits_laitiers', file: "Crème_d'Isigny_2.JPG" },
  { keywords: ['yaourt', 'yogourt', 'fromage blanc', 'skyr', 'petit suisse', 'faisselle'], category: 'produits_laitiers', file: 'Joghurt.jpg' },
  { keywords: ['mozzarella'], category: 'produits_laitiers', file: 'Mozzarella_di_bufala3.jpg' },
  { keywords: ['feta'], category: 'produits_laitiers', file: 'Feta_Cheese.jpg' },
  { keywords: ['chevre', 'fromage de chevre'], category: 'produits_laitiers', file: 'Queijo cabreiro.jpg' },
  { keywords: ['fromage', 'emmental', 'gruyere', 'comte', 'camembert', 'brie', 'parmesan', 'raclette', 'roquefort', 'reblochon', 'mascarpone', 'ricotta'], category: 'produits_laitiers', file: 'Cheese_platter.jpg' },
  { keywords: ['beurre', 'margarine'], category: 'produits_laitiers', file: 'Block of butter 20200928 080207.jpg' },
  { keywords: ['lait'], category: 'produits_laitiers', file: 'Milk_glass.jpg' },
  { keywords: ['oeuf'], category: 'produits_laitiers', file: 'Raw_egg.jpg' },
  // Féculents
  { keywords: ['lentille', 'pois chiche', 'flageolet'], category: 'feculents', file: '3_types_of_lentil.png' },
  { keywords: ['riz'], category: 'feculents', file: 'Bowl of white rice 01.jpg' },
  { keywords: ['pate', 'spaghetti', 'penne', 'fusilli', 'tagliatelle', 'macaroni', 'coquillette', 'gnocchi', 'ravioli'], category: 'feculents', file: 'Fusilli and Penne Pasta.jpg' },
  { keywords: ['pain', 'baguette', 'pain de mie'], category: 'feculents', file: 'Baguette mie.jpg' },
  { keywords: ['farine'], category: 'feculents', file: 'All-Purpose Flour (4107895947).jpg' },
  { keywords: ['semoule', 'couscous', 'quinoa', 'boulgour', 'ble', 'polenta', 'tortilla'], category: 'feculents' },
  // Plats préparés
  { keywords: ['lasagne'], category: 'plats_prepares', file: 'Lasagne_-_stonesoup.jpg' },
  { keywords: ['quiche'], category: 'plats_prepares', file: '54._Quiche_lorraine.jpg' },
  { keywords: ['soupe', 'veloute', 'potage', 'gaspacho'], category: 'plats_prepares', file: 'Traditional Vegetable Soup from Argentina.jpg' },
  { keywords: ['surgele'], category: 'autre', file: 'Frozen_berries_(35379207760).jpg' },
  { keywords: ['plat prepare', 'plat cuisine', 'reste', 'gratin', 'hachis', 'chili', 'curry', 'paella', 'couscous royal'], category: 'plats_prepares', file: 'TupperwareLeftovers.jpg' },
];

/** Recettes : une photo par recette intégrée. */
export const RECIPE_IMAGES: Readonly<Record<string, string>> = {
  'soupe-legumes': 'Traditional Vegetable Soup from Argentina.jpg',
  gratin: 'Cheese_and_potato_casserole_from_Poznan_(2).JPG',
  omelette: 'Omelette-Plate.jpg',
  quiche: '54._Quiche_lorraine.jpg',
  smoothie: 'Fruit_smoothie_(8475314736).png',
  'riz-saute': 'Yeung_Chow_Fried_Rice.jpg',
  'salade-composee': 'Antipasti_002.jpg',
  'poelee-legumes': 'Stir Fry Vegetables in Pan.jpg',
  'pain-perdu': 'FrenchToast.JPG',
  compote: 'Apple-sauce-544676.jpg',
  'pates-creme': 'Creamy white sauce penne pasta.jpg',
  hachis: 'Hachis_parmentier_01.jpg',
  'cake-sale': 'Brot 001 2016 07 03.jpg',
  'plat-revisite': 'TupperwareLeftovers.jpg',
  crumble: 'British apple crumble 02.jpg',
  'banana-bread': 'Banana bread.jpg',
  'pudding-pain': 'Bread pudding.jpg',
  croutons: 'Croutons.jpg',
  'pesto-fanes': 'Pesto.jpg',
  'curry-legumes': 'Mixed vegetable curry 1.jpg',
  'pizza-restes': 'Pizza.jpg',
  croque: 'Croque-monsieur.jpg',
  gaspacho: 'Gazpacho.jpg',
  ratatouille: 'Ratatouille.jpg',
  chili: 'Chili con carne.jpg',
  'riz-au-lait': 'Riz au lait aux zestes d’agrumes et son caramel croquant aux noisettes torréfiées.jpg',
  crepes: 'Crêpes.jpg',
  'gateau-yaourt': 'Vanilla yogurt pound cake (43128425162).jpg',
  bouillon: 'Vegan Vegetable Stock (8530528590).jpg',
  'salade-pates': 'Pasta salad.jpg',
  bruschetta: 'Bruschetta.jpg',
  papillote: 'Branzino al cartoccio.jpg',
  galettes: 'Cabbage fritters gorengan.JPG',
  wraps: 'Burrito.jpg',
  shakshuka: 'Shakshuka.jpg',
  minestrone: 'Minestrone.jpg',
  clafoutis: 'Clafoutis aux Cerises.jpg',
  houmous: 'Hummus.jpg',
};

/** Conseils : une photo d’ambiance par fiche. */
export const TIP_IMAGES: Readonly<Record<string, string>> = {
  dlc: 'Raw chicken slices.jpg',
  ddm: 'Fusilli and Penne Pasta.jpg',
  rangement: 'LG_refrigerator_interior.jpg',
  congelation: 'Frozen_berries_(35379207760).jpg',
  'encore-bon': 'Raw_egg.jpg',
  reflexes: 'TupperwareLeftovers.jpg',
};
