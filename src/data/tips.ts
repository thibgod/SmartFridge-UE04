import type { Tip } from '@/types/content';

export const TIPS: readonly Tip[] = [
  {
    id: 'dlc',
    title: 'DLC : « à consommer jusqu’au »',
    subtitle: 'Une date limite à respecter',
    icon: 'alert-circle-outline',
    tone: 'rose',
    intro:
      'La date limite de consommation concerne les produits frais et très périssables. Après cette date, le produit peut présenter un risque pour la santé, même s’il a l’air normal.',
    sections: [
      {
        heading: 'Où la trouve-t-on ?',
        bullets: ['Viande et poisson frais', 'Charcuterie à la coupe ou en barquette', 'Produits laitiers frais (crème, fromages frais)', 'Plats cuisinés réfrigérés'],
      },
      {
        heading: 'Le bon réflexe',
        bullets: [
          'Placez en premier les produits à DLC proche.',
          'Pas le temps de le cuisiner ? Congelez-le avant la date, puis décongelez-le au réfrigérateur, jamais à température ambiante.',
        ],
      },
    ],
    caution: 'Après la DLC, mieux vaut ne pas consommer le produit, en particulier pour les personnes fragiles (femmes enceintes, jeunes enfants, personnes âgées).',
  },
  {
    id: 'ddm',
    title: 'DDM : « de préférence avant »',
    subtitle: 'Une date indicative',
    icon: 'time-outline',
    tone: 'green',
    intro:
      'La date de durabilité minimale indique jusqu’à quand le produit garde toutes ses qualités (goût, texture, vitamines). Passé cette date, il reste en général consommable sans danger.',
    sections: [
      {
        heading: 'Produits concernés',
        bullets: ['Pâtes, riz, farine, céréales', 'Biscuits, chocolat, café, thé', 'Conserves, bocaux, épices'],
      },
      {
        heading: 'Comment juger ?',
        bullets: [
          'L’emballage est intact, sans gonflement ni rouille.',
          'L’aspect et l’odeur sont normaux.',
          'Le goût peut être un peu moins intense : ce n’est pas un problème de sécurité.',
        ],
      },
    ],
  },
  {
    id: 'rangement',
    title: 'Bien ranger son frigo',
    subtitle: 'Chaque zone a sa température',
    icon: 'grid-outline',
    tone: 'blue',
    intro:
      'Un frigo bien rangé conserve mieux et évite les oublis. Réglez-le autour de 4 °C dans la zone la plus froide.',
    sections: [
      {
        heading: 'Les zones (frigo classique)',
        bullets: [
          'Zone la plus froide (0 à 4 °C) : viande, poisson, charcuterie, plats cuisinés.',
          'Zone fraîche (4 à 6 °C) : produits laitiers, restes, desserts.',
          'Bac à légumes (6 à 10 °C) : fruits et légumes lavés et séchés.',
          'Porte (la moins froide) : beurre, œufs, boissons, sauces entamées.',
        ],
      },
      {
        heading: 'Premier entré, premier sorti',
        bullets: [
          'Rangez les nouvelles courses au fond et avancez les plus anciennes.',
          'Gardez une étagère « à manger vite » bien visible.',
        ],
      },
    ],
    caution: 'L’emplacement de la zone froide varie selon les modèles : consultez la notice de votre appareil.',
  },
  {
    id: 'congelation',
    title: 'Ce qui se congèle (ou pas)',
    subtitle: 'Le congélateur, meilleur allié anti-gaspi',
    icon: 'snow-outline',
    tone: 'mint',
    intro: 'Congeler à temps permet de « mettre en pause » un produit. Notez la date sur l’emballage.',
    sections: [
      {
        heading: 'Se congèle très bien',
        bullets: ['Pain, viennoiseries', 'Viande et poisson crus (avant la DLC)', 'Plats cuisinés, soupes, sauces', 'Fruits coupés, beurre, fromage râpé'],
      },
      {
        heading: 'À éviter',
        bullets: [
          'Salade, concombre, radis : ils deviennent mous.',
          'Œufs dans leur coquille : ils éclatent.',
          'Yaourts et crème liquide : la texture se dégrade (utilisables en cuisine).',
          'Un produit décongelé ne se recongèle pas cru.',
        ],
      },
    ],
  },
  {
    id: 'encore-bon',
    title: 'Reconnaître un aliment encore bon',
    subtitle: 'Vos sens sont de bons indicateurs',
    icon: 'eye-outline',
    tone: 'amber',
    intro:
      'Pour un produit à DDM ou des fruits et légumes, la vue, l’odeur et la texture aident à décider. Pour un produit à DLC dépassée, ces tests ne suffisent pas.',
    sections: [
      {
        heading: 'Observer',
        bullets: [
          'Vue : pas de moisissure, de couleur anormale ni d’emballage gonflé.',
          'Odeur : aigre, rance ou inhabituelle = on jette.',
          'Texture : visqueuse ou collante = on jette.',
        ],
      },
      {
        heading: 'Le test de l’œuf',
        bullets: [
          'Plongez l’œuf dans un verre d’eau froide.',
          'Il reste au fond à plat : il est frais.',
          'Il se redresse : il est moins frais, à bien cuire rapidement.',
          'Il flotte : il est ancien, mieux vaut ne pas le consommer.',
        ],
      },
    ],
    caution: 'Ce test indique l’âge de l’œuf, pas l’absence de bactéries. En cas de doute, ne prenez pas de risque.',
  },
  {
    id: 'reflexes',
    title: 'Réflexes anti-gaspi du quotidien',
    subtitle: 'De petits gestes, un vrai impact',
    icon: 'sparkles-outline',
    tone: 'sand',
    intro: 'Pas besoin d’être parfait : quelques habitudes suffisent pour jeter beaucoup moins.',
    sections: [
      {
        bullets: [
          'Jetez un œil à SmartFridge avant de faire les courses.',
          'Faites une liste et achetez les quantités dont vous avez vraiment besoin.',
          'Prévoyez un repas « vide-frigo » par semaine.',
          'Cuisinez les restes : soupes, gratins, omelettes, quiches.',
          'Congelez avant qu’il ne soit trop tard.',
          'Gardez les fanes, croûtes et épluchures propres pour bouillons et pestos.',
        ],
      },
    ],
  },
];
