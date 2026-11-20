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

## Phase 4 — Plus tard / à arbitrer

- ✅ Widget Android (Premium) : mêmes données et couleurs que sur iPhone, clair et sombre, taille réglable, mis à jour dès que l’inventaire change et toutes les 6 h sans ouvrir l’app (`react-native-android-widget`)
- ✅ Android : balayage vers la droite, « Consommé » ne réagissait pas au toucher (bug [RNGH #3223](https://github.com/software-mansion/react-native-gesture-handler/issues/3223)) ; corrigé par `patches/react-native-gesture-handler+2.32.0.patch`, à retirer quand le SDK embarquera la correction
- ✅ Android : changement d’icône et rapport PDF vérifiés sur émulateur ; les liens `smartfridge://` restent actifs quelle que soit l’icône choisie (`plugins/withAliasDeepLinks.js`)
- ⬜ Partage du frigo dans le foyer (nécessite un serveur et un compte : sort du « 100 % local »)
- ✅ Liste de courses : partage en texte par la feuille de partage du téléphone (déjà en place)
- ⬜ Création directe des articles dans Rappels / Google Keep
- ⬜ Tester scan, ticket et date sur un vrai téléphone Android (ML Kit)
