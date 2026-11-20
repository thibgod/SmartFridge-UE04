/**
 * Politique de confidentialité : source unique, affichée dans l’app (Réglages → Confidentialité)
 * et recopiée dans PRIVACY.md pour la page web demandée par les stores.
 * Après modification : UPDATE_PRIVACY=1 npx jest legal (le test vérifie que les deux concordent).
 */

export const PRIVACY_UPDATED_AT = '5 novembre 2026';

export interface PrivacySection {
  title: string;
  paragraphs?: string[];
  /** Puces « **Titre** : texte » ; le titre est mis en gras. */
  items?: { label: string; text: string }[];
}

export const PRIVACY_INTRO =
  'SmartFridge est une application anti-gaspillage qui fonctionne entièrement sur votre téléphone. Elle ne demande aucun compte et ne contient ni publicité, ni outil de mesure d’audience, ni traceur.';

export const PRIVACY_SECTIONS: readonly PrivacySection[] = [
  {
    title: 'Données stockées sur votre téléphone',
    paragraphs: [
      'Vos produits (nom, catégorie, quantité, prix, dates, emplacement, lieu, notes, photo éventuelle), votre liste de courses, vos recettes favorites et cuisinées et vos réglages sont enregistrés sur votre appareil. SmartFridge n’a pas de serveur et ne les reçoit jamais.',
      'Le widget d’écran d’accueil lit une copie de la liste des produits à consommer vite, conservée elle aussi sur le téléphone.',
      'Si la sauvegarde de votre téléphone est activée (iCloud sur iPhone, Google sur Android), Apple ou Google peuvent y inclure les données de l’application, selon leurs propres conditions. Vous gérez cela dans les réglages du téléphone.',
      'Avec Premium, la sauvegarde automatique écrit chaque jour une copie de ces données dans un dossier de l’application, sur le téléphone (7 copies gardées). Sur iPhone, ce dossier est visible dans l’app Fichiers. Elle se désactive dans Réglages → Sauvegarde. Les exports du Bilan (PDF, tableau) sont créés sur le téléphone et ne partent que là où vous choisissez de les partager.',
      'Vous pouvez exporter une sauvegarde (un fichier que vous enregistrez où vous le souhaitez) ou tout effacer depuis Réglages → Données. Supprimer l’application supprime aussi toutes ses données.',
    ],
  },
  {
    title: 'Données envoyées à des services tiers',
    paragraphs: ['Pour vous aider à remplir une fiche ou l’illustrer, l’application peut contacter :'],
    items: [
      {
        label: 'Open Food Facts (base de données alimentaire libre)',
        text: 'uniquement le code-barres scanné ou saisi, pour retrouver le nom, la photo et la catégorie du produit.',
      },
      {
        label: 'Wikimedia (Wikipédia, Wikimedia Commons)',
        text: 'uniquement le nom d’un produit ou d’une photo, pour afficher une illustration et son crédit. Désactivable dans Réglages → Apparence → « Illustrations automatiques ».',
      },
    ],
  },
  {
    title: 'Lecture des codes-barres, tickets et dates',
    paragraphs: [
      'Les codes-barres, le texte des tickets de caisse et les dates sur les emballages sont lus directement sur le téléphone, par Apple Vision sur iPhone et par ML Kit de Google sur Android. Les images et le texte lus ne sont ni enregistrés ni envoyés.',
      'Sur Android, ML Kit peut transmettre à Google des statistiques techniques sur son fonctionnement (modèle de l’appareil, version de l’application, performances), sans les images ni le texte. Voir developers.google.com/ml-kit/terms.',
    ],
  },
  {
    title: 'Autorisations',
    items: [
      {
        label: 'Appareil photo',
        text: 'scanner un code-barres, photographier un ticket, une date ou votre produit. Seule la photo d’un produit que vous choisissez de garder est enregistrée, sur le téléphone.',
      },
      { label: 'Photos', text: 'uniquement l’image que vous choisissez vous-même (ticket ou photo de produit).' },
      { label: 'Notifications', text: 'rappels programmés sur votre téléphone avant la date de péremption de vos produits.' },
    ],
  },
  {
    title: 'Abonnement SmartFridge Premium',
    paragraphs: [
      'Le paiement et la gestion de l’abonnement sont assurés par Apple (App Store) ou Google (Google Play), selon leurs propres conditions. SmartFridge ne voit ni votre identité, ni vos coordonnées bancaires : l’application demande seulement au store si un abonnement est actif sur votre compte.',
    ],
  },
  {
    title: 'Ce que les services voient',
    paragraphs: [
      'Aucun identifiant personnel, aucune donnée de localisation et aucun identifiant publicitaire ne sont transmis. Comme pour toute connexion internet, les services contactés voient l’adresse IP de la requête ; consultez leurs politiques (openfoodfacts.org, wikimediafoundation.org, policies.google.com).',
    ],
  },
  {
    title: 'Contact',
    paragraphs: ['Pour toute question, utilisez le lien « Assistance » de la fiche SmartFridge sur l’App Store ou Google Play.'],
  },
];

/** Version Markdown, identique au contenu affiché dans l’app (PRIVACY.md). */
export function privacyMarkdown(): string {
  const lines = [
    '# Politique de confidentialité — SmartFridge',
    '',
    `*Dernière mise à jour : ${PRIVACY_UPDATED_AT}*`,
    '',
    PRIVACY_INTRO,
    '',
  ];
  for (const section of PRIVACY_SECTIONS) {
    lines.push(`## ${section.title}`, '');
    for (const paragraph of section.paragraphs ?? []) lines.push(paragraph, '');
    if (section.items) {
      for (const item of section.items) lines.push(`- **${item.label}** : ${item.text}`);
      lines.push('');
    }
  }
  return lines.join('\n');
}
