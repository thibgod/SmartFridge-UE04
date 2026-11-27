# SmartFridge — feuille de route

Mise à jour au fil du développement. ✅ fait · 🔄 en cours · ⬜ à faire.

## Déjà en place (rappel)

Inventaire frigo / congélateur / placard, scan code-barres (Open Food Facts), ticket de caisse et date lus
sur le téléphone, photos personnelles, rappels locaux groupés par jour, widget iOS, liste de courses,
38 recettes avec portions et mode cuisine, Bilan (score, impact CO₂, badges), utilisation partielle,
sauvegarde / restauration, mode sombre, Android vérifié sur émulateur.

## Phase 1 — Finitions et frictions (qualité perçue)

- ✅ Bouton d’ajout qui suit l’emplacement (frigo / congélateur / placard)
- ✅ Présentation (onboarding) à jour : elle ne parle ni des courses, ni du ticket, ni des recettes guidées
- ✅ Frigo vide : proposer aussi « Photographier un ticket » (le moyen le plus rapide de remplir l’app)
- ✅ Doublons : prévenir à l’ajout quand le même produit est déjà au frigo (sans bloquer)
- ✅ Ticket de caisse : bouton « Annuler » après l’ajout groupé (une erreur de lecture se rattrape d’un geste)
- ✅ Liste de courses : modifier un article (appui long : nom, quantité, rayon)
- ✅ Formulaires : le bouton « Enregistrer » reste visible au-dessus du clavier

## Phase 2 — Valeur d’usage au quotidien

- ✅ « Idée pour ce soir » sur l’accueil : la recette qui sauve le plus de produits urgents, en un toucher
- ✅ Fiche produit : « Vos achats précédents » (prix moyen, durée réelle de conservation, produits jetés, trois derniers achats)
- ✅ Durées de conservation apprises : la date suggérée suit vos achats précédents du même produit (médiane)

- ✅ Historique dans le formulaire d’ajout (« Déjà acheté 4 fois, 2,10 € en moyenne ») et alerte quand le produit est souvent jeté

- ✅ Android revérifié sur émulateur après les phases 1 et 2 (migration v7 sans perte)

## Phase 3 — Design et finitions

- ✅ Accueil : carrousel « À consommer en priorité » retiré (il doublait la liste), l’inventaire remonte
- ✅ Accueil : bouton d’ajout rond, qui ne masque plus les boutons des lignes
- ✅ Bilan : compteurs fusionnés dans les cartes de montants (une rangée en moins, rien de perdu)
- ✅ Illustrations : une image Wikipédia n’est retenue que si la page décrit un aliment (plus de photo de célébrité pour « Chris »)
- ✅ Web : photos et retour depuis un lien direct corrigés
- ✅ Lignes du frigo : balayage pour « Consommé » (droite) ou « Jeté » (gauche), puis toucher l’action — fini les validations par mégarde ; le bouton « + » s’efface pendant le geste
- ✅ Refonte de l’accueil : lignes sur deux lignes avec pastille d’échéance (« Auj. », « 3 j », « 2 sem. »), tuiles plus compactes aux libellés concrets (« ≤ 3 jours »), recherche affichée seulement à partir de 6 produits
- ✅ Astuce visuelle du balayage au premier usage (la première ligne s’entrouvre pour montrer le geste), retirée une fois comprise
- ✅ Animations : le bouton « Ajouter » se replie au défilement et s’efface en fondu pendant un balayage ; les produits consommés, jetés ou filtrés et les articles de courses retirés s’effacent en fondu, les suivants remontent en douceur ; la croix de la recherche apparaît en fondu
- ✅ Onglet « Mon frigo » : icône de frigo
- ✅ Accueil : les lots du même produit au même endroit sont réunis sur une ligne (« Beurre doux ×4 · jusqu’au 6 janv. ») ; toucher la ligne affiche les lots (lots identiques réunis : « 2 × 250 g · ajoutés le 21 nov. »), « Consommé » / « Jeté » s’appliquent au plus pressé
- ✅ Ajout : champ « Nombre de lots » (4 beurres d’un coup, chacun consommable à part, dans la limite des places libres de la version gratuite) ; quantité comprise aussi en toutes lettres (« 250 grammes », « 1 litre », « 2 kilos », « 50 centilitres »)
- ✅ Mascotte : un petit frigo tourné vers la droite qui attend derrière la barre du bas et en sort pour parler dans une bulle de BD (contour encré, ombre décalée, pointe vers sa tête) ; bonjour une fois par jour avec le produit le plus pressé, réaction nommée quand un produit est consommé ou jeté avec « Annuler » dans la bulle (remplace le message du bas), répliques au toucher, 8 expressions (contente, amoureuse, clin d’œil, surprise, inquiète, endormie la nuit, fâchée si on la tapote trop vite) ; se cache quand la liste défile ou qu’une ligne est ouverte, ne s’anime que sur l’écran affiché

## Phase 5 — Mise en production

- ✅ Crédits photo : auteur et licence de chaque photo Wikimedia sur les grandes photos et dans Réglages → « Crédits et licences » (93 photos, script `scripts/fetch-image-credits.mjs`) ; 6 photos sous GFDL seule remplacées par des photos CC / domaine public
- ✅ Politique de confidentialité à jour (photos de produits, lecture des dates, widget, ML Kit sur Android), lisible dans l’app et identique à PRIVACY.md (vérifié par un test)
- ✅ Écran de secours en cas de plantage (« Réessayer », « Retour à l’accueil »), au lieu d’une page blanche
- ✅ Mode bêta piloté par le profil EAS (`beta` pour TestFlight, `production` pour les stores)
- ✅ Textes de permission iOS exacts et en français (plus de chaîne micro en anglais), permissions Android inutiles retirées
- ✅ Très grand texte (accessibilité) : plus de mots coupés ni de boutons tronqués ; présentation défilable
- ✅ Dépendance `react-native-worklets` déclarée (expo-doctor 21/21) ; toast « Annuler » visible 6 s
- ✅ Fiche des stores, questionnaires de confidentialité et liste de contrôle : [STORE.md](STORE.md)
- ⬜ Publier PRIVACY.md à une adresse web publique et choisir une adresse d’assistance (à faire par le propriétaire du compte)
- ✅ Captures d’écran des stores (App Store 6,9 pouces, iPhone Duo, Google Play) et bannière Google Play, dans `store/`
- ✅ iPhone Duo : compilation avec le SDK iOS 27.1 (l’app remplit l’écran déplié), marges latérales respectées (colonne de l’appareil photo), bouton « Ajouter » aligné sur la colonne de contenu, libellés d’onglets courts si la place manque
- ✅ Tablettes : iPad pris en charge (`supportsTablet`, toutes les orientations sur iPad, téléphones toujours en portrait) ; modèle d’appareil détecté (`utils/layout.ts` : iPad, ou plus petit côté ≥ 600 points sur Android) ; sur tablette, grilles Recettes et Conseils plus larges (3 à 4 colonnes) et accueil en deux colonnes à l’horizontale (résumé et filtres à gauche, produits à droite)
- ⬜ Captures App Store iPad 13 pouces (obligatoires maintenant que l’app est proposée sur iPad) et vérification sur simulateur iPad et tablette Android
- ⬜ Tablettes Android : l’app reste en portrait sous Android 15 et avant (`orientation` d’`app.json`) ; Android 16 l’ignore sur grand écran

## Phase 6 — SmartFridge Premium (voir PREMIUM.md)

- ✅ Abonnement mensuel / annuel natif, essai de 7 jours, partage familial, écran d’offre, restauration
- ✅ Limites de la version gratuite (30 produits, 15 recettes, 3 tickets / mois, widget, Bilan détaillé)
- ✅ Plusieurs frigos et lieux · sauvegarde automatique · couleurs d’accent · icônes d’app alternatives · export PDF et CSV du Bilan

## Phase 7 — Audit d’interface (principes Apple)

- ✅ « Réduire les animations » respecté (anneau du score, graphique, démonstration du balayage)
- ✅ Retour visuel dès l’appui sur les 22 éléments touchables qui n’en avaient pas
- ✅ Déclic haptique quand un panneau de balayage s’enclenche ; vibration « consommé / jeté » au moment du geste
- ✅ Bouton « + » et toast sans rebond (ressort amorti), « Restaurer mes achats » avec état d’attente

## Phase 8 — Badges façon Apple Fitness

- ✅ Médailles dessinées en SVG : métal selon la difficulté (bronze, argent, or, platine), forme selon la famille (cercle, hexagone, octogone, rosace), icône gravée, anneau d'avancement sur les médailles pas encore gagnées
- ✅ Fiche d'une médaille (feuille iOS) : on la fait tourner au doigt avec son élan, revers gravé, reflet qui suit la rotation ; elle se pose sur la face la plus proche (on peut lire le revers gravé), un lancer ajoute au plus un tour, un toucher la retourne
- ✅ Obtention fêtée une seule fois : pastille « Nouveau », reflet, arrivée en tournant et déclic haptique ; « Réduire les animations » respecté

## Phase 9 — Refonte « Liquid Glass »

- ✅ Design system : jetons `theme/liquidGlass.ts` (matériaux, rayons concentriques, ressorts, reflets, ombres teintées) et composants `components/glass/` (surface, carte, bouton, en-tête, barre d’onglets, fond d’ambiance)
- ✅ Rendu par appareil : vrai Liquid Glass sur iOS 26 et plus (testé sur iOS 27), flou sur iOS plus ancien, verre simulé sur Android, surface pleine avec « Réduire la transparence » ; contraste du texte testé
- ✅ Barre d’onglets flottante en verre : la pastille glisse d’onglet en onglet ; listes, bouton « + », toast et mascotte placés au-dessus (vérifié sur simulateur iOS 27, clair et sombre)
- ✅ Mon frigo : fond d’ambiance, en-tête flottant en verre (boutons Scanner / Réglages, titre compact au défilement), filtres de lieu en verre avec pastille glissante, bouton « Ajouter » en verre teinté ; les fiches produits restent pleines (contenu, pas commande)
- ✅ Courses : fond d’ambiance, en-tête flottant (bouton Partager en verre), champ « Ajouter un article » en capsule de verre ; la liste reste pleine
- ✅ Recettes, Bilan, Conseils : en-tête flottant en verre, recherche en capsule de verre, choix de période du Bilan en verre
- ✅ Fond d’ambiance unique derrière les onglets (trois halos pastel, contraste testé) ; barre du bas qui se réduit au défilement et se déplie en remontant ; grand titre remonté sur la ligne des boutons
- ✅ Fiche produit : boutons Modifier / Fermer en verre sur la photo, barre en verre avec le nom au défilement, photo en parallaxe qui s’étire quand on tire, Consommé / Jeté en verre teinté vert / rouge (variante `destructive`, contraste testé)
- ✅ Fiche recette : même traitement que la fiche produit ; « J’ai cuisiné » / « Cuisiner » en barre d’outils de verre flottante
- ✅ Barres en verre « à la Apple Music » : on garde le doigt sur la barre d’onglets (ou les filtres) et on glisse, la capsule suit le doigt en grossissant et l’élément sous le doigt s’ouvre au relâchement ; capsule de sélection allongée gris verre ; barre posée au niveau de l’indicateur d’accueil
- ✅ Ajout / modification de produit : fond d’ambiance, emplacement en verre (glissement compris), bouton d’enregistrement en verre teinté sans bandeau, barre de titre transparente posée sur le fond
- ✅ Réglages, Premium, Mes lieux, Ticket de caisse, Modifier l’article, Confidentialité, Crédits : fond d’ambiance par défaut de toutes les feuilles, barre de titre transparente, contrôles et boutons d’action en verre (plus de bandeaux opaques en bas)
- ✅ Fiche conseil et mode cuisine : boutons en verre, minuteur sur plaque de verre, rail des étapes lisible sur le fond
- ⬜ Écrans restants : scanner, onboarding, fiche badge (déjà très travaillée)
- ⬜ Essai sur iPhone (iOS 26 et iOS 18) et sur Android (12+ et plus ancien)

## Phase 10 — Bilan juste et courses intelligentes

### Calcul des économies

Problème : aujourd’hui (`closedAmounts`, `src/utils/stats.ts`), chaque produit consommé compte son prix entier comme
« économisé ». Manger ce qu’on a acheté n’est pas une économie : plus on fait de courses, plus le chiffre monte. Même
défaut pour « Nourriture sauvée » et « CO₂ évité » (`computeImpact`, `src/utils/impact.ts`), qui comptent tout ce qui
est mangé. « Perdu » (produits jetés, part mangée déduite) est juste et ne change pas.

- ✅ « Sauvé de justesse » : ne compter que les produits consommés alors qu’ils étaient dans la zone « à consommer
  vite » (seuil `urgentThresholdDays`, 3 jours par défaut) ou déjà périmés, d’après `closedAt` et `expiresAt` ; c’est
  ce que l’app a vraiment évité de jeter
- ✅ Comparaison au foyer moyen, présentée comme une estimation : « Vous jetez X % de vos courses, contre ~15 % en
  moyenne » et (15 % − votre taux) × valeur des produits suivis ; repères ADEME (≈ 29 kg et ≈ 108 € jetés par
  personne et par an à la maison) et WRAP (≈ 15 % des achats consommables jetés)
- ✅ « Nourriture sauvée » et « CO₂ évité » suivent la même règle que « Sauvé de justesse »
- ✅ Bilan : « Économisés » = estimation par rapport à un foyer moyen, carte « Par rapport à un foyer moyen » (deux
  barres, phrase, « dont X € sauvés de justesse ») ; PDF et graphique mensuel (« Mangés ») à jour ; badge « Belles
  économies » = 50 € économisés par rapport à un foyer moyen ; CSV inchangé (il ne contenait que les pertes)

### Suggestions de courses en quantités logiques

Point de départ : « À racheter ? » (`suggestRestock`, `src/features/shopping/shoppingLogic.ts`) propose les produits
achetés au moins deux fois et absents du frigo, sans quantité ni rythme.

- ✅ Nombre de personnes dans le foyer : réglage « Votre foyer » (adultes, enfants de moins de 12 ans comptés
  0,7 adulte d’après les apports de référence EFSA 2013), inclus dans les sauvegardes ; rappel discret sous « À
  racheter ? » tant qu’il n’est pas indiqué
- ⬜ Demander la taille du foyer pendant la présentation (onboarding)
- ✅ Rythme de consommation appris : pour chaque produit, durée réelle entre achat et consommation
  (`addedAt` → `closedAt`) et quantité consommée par semaine ; proposer de racheter quand le stock prévu s’épuise
  avant la prochaine course, pas seulement quand il est à zéro
- ✅ Quantité proposée = consommation moyenne × nombre de jours jusqu’à la prochaine course, corrigée par la taille
  du foyer quand l’historique est court (repères par personne et par catégorie) ; arrondie à l’unité d’achat habituelle
- ✅ Ne jamais pousser à trop acheter : quantité réduite pour un produit souvent jeté (« vous en jetez 1 sur 3 :
  prenez-en moins »), et rien d’ajouté si le frigo en contient encore assez avant sa date ; jamais plus que ce qui
  sera mangé avant la date habituelle du produit
- ✅ Intervalle entre deux courses appris (écart médian entre les jours d’achat, 7 jours par défaut) ; calcul dans
  `src/features/shopping/restockPlan.ts`, références INCA 3 (ANSES 2017) par catégorie
- ⬜ Planning des repas (optionnel) : choisir des recettes pour la semaine, ajuster les portions au nombre de
  personnes et ajouter à la liste les ingrédients manquants (s’appuie sur `missingIngredients`)
- ✅ Fonctions pures testées dans `src/features/shopping/`, sans aucun appel réseau (règle « 100 % local »)

Sources : [ADEME, réduire le gaspillage alimentaire](https://agirpourlatransition.ademe.fr/particuliers/reduire-dechets/eviter-gaspillage/reduire-gaspillage-alimentaire),
[Defra / WRAP, part des achats gaspillés](https://assets.publishing.service.gov.uk/media/5a79ff75ed915d6d99f5c689/defra-stats-foodfarm-food-foodwastepurchases-100727.pdf),
[Too Good To Go, méthode d’impact](https://www.toogoodtogo.com/about-us/our-impact-calculation),
[ANSES, INCA 3](https://www.anses.fr/fr/system/files/PRES2017DPA04.pdf),
[EFSA 2013, apports énergétiques (repris par Nestlé)](https://www.nutripro.nestle.fr/sites/default/files/2021-04/enfant_portion.pdf),
[Kantar, fréquence des courses](https://www.kantar.com/fr/inspirations/consommateurs-acheteurs-et-distributeurs/2023-analyseconsommation1t2023).

## Phase 4 — Plus tard / à arbitrer

- ✅ Widget Android (Premium) : mêmes données et couleurs que sur iPhone, clair et sombre, taille réglable, mis à jour dès que l’inventaire change et toutes les 6 h sans ouvrir l’app (`react-native-android-widget`)
- ✅ Android : balayage vers la droite, « Consommé » ne réagissait pas au toucher (bug [RNGH #3223](https://github.com/software-mansion/react-native-gesture-handler/issues/3223)) ; corrigé par `patches/react-native-gesture-handler+2.32.0.patch`, à retirer quand le SDK embarquera la correction
- ✅ Android : changement d’icône et rapport PDF vérifiés sur émulateur ; les liens `smartfridge://` restent actifs quelle que soit l’icône choisie (`plugins/withAliasDeepLinks.js`)
- 🔄 Partage du frigo dans le foyer (« Famille ») : cœur de synchronisation prêt et testé, sans réseau ni écran ; le reste demande une décision d’équipe (serveur et comptes : sort du « 100 % local »). Voir [FAMILLE.md](FAMILLE.md)
- ✅ Liste de courses : partage en texte par la feuille de partage du téléphone (déjà en place)
- ⬜ Création directe des articles dans Rappels / Google Keep
- ⬜ Tester scan, ticket et date sur un vrai téléphone Android (ML Kit)
