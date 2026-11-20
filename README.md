# SmartFridge — rendu UE04 Analyse informatique (groupe 1A3-3)

Madame, Monsieur,

Voici le projet de notre groupe pour le cours d’Analyse informatique (HELMo, Bloc 1, IA).
SmartFridge est une application mobile anti-gaspillage pour iPhone et Android : on enregistre ce que l’on a
au frigo, au congélateur et au placard, et l’application prévient avant la date de péremption.

## Ce que vous trouverez ici

| Élément | Emplacement |
| --- | --- |
| Diagramme de cas d’utilisation | [docs/analyse/cas-utilisation.png](docs/analyse/cas-utilisation.png) (aussi en PDF et SVG) |
| Diagramme d’activité « Ajouter un produit » | [docs/analyse/activite-ajouter-produit.png](docs/analyse/activite-ajouter-produit.png) |
| Diagramme d’activité « Envoyer les rappels de péremption » | [docs/analyse/activite-rappels.png](docs/analyse/activite-rappels.png) |
| Journal de bord de l’équipe | [docs/journal-de-bord.md](docs/journal-de-bord.md) |
| Code de l’application | [src/](src/) (écrans dans `src/app/`, logique dans `src/features/` et `src/utils/`) |
| Tests automatiques (Jest) | [src/__tests__/](src/__tests__/) |
| Captures d’écran de l’application | [store/](store/) |

Les diagrammes suivent les deux cours « UML · Cours pratique » (cas d’utilisation, diagramme d’activité).

## Lancer l’application (facultatif)

Il faut Node 20 ou plus, et Xcode (iPhone) ou Android Studio (Android). Expo Go ne suffit pas, car
l’application contient des modules natifs.

```bash
npm install
npx expo run:ios        # ou : npx expo run:android
npm test                # tests automatiques
```

Le projet a été développé avec l’aide d’un assistant de programmation par IA, comme le décrit le journal de bord.

---

## Documentation technique

Application mobile iOS / Android anti-gaspillage : inventaire du frigo, du congélateur et du placard,
rappels locaux avant péremption, statistiques d’économies et recettes anti-gaspi.

- 100 % local : l’inventaire reste sur l’appareil (SQLite).
- Aucun compte, aucun serveur, aucune mesure d’audience. Abonnement Premium optionnel, par les achats natifs Apple et Google.
- Deux appels réseau, sans donnée personnelle :
  - Open Food Facts, pour pré-remplir une fiche à partir d’un code-barres (seul le code est envoyé) ;
  - Wikimedia (Commons / Wikipédia), pour illustrer un produit sans photo (seul son nom est envoyé),
    désactivable dans les réglages (« Illustrations automatiques »).

## Fonctionnalités

- **Mon frigo** : phrase du jour, résumé en 3 tuiles qui servent aussi de filtre (Périmés / Vite / Tranquille),
  idée de recette pour ce soir, lignes produit épurées (glisser à droite : consommé, à gauche : jeté), recherche
  sans accents, emplacement en contrôle segmenté, bouton « + » flottant, pastille sur l’onglet.
- **Fiche produit** : grande photo, compte à rebours, Consommé / Jeté, gestes anti-gaspi en un toucher
  (**Congeler maintenant**, **Sortir du congélateur**, **Je l’ai entamé**, avec annulation) et recettes associées.
- **Ajout en quelques secondes** : « Vos habitués » (produits fréquents en un toucher), scan ou saisie du
  code-barres, catégories en tuiles, **date suggérée**, bouton d’enregistrement toujours visible.
- **Compréhension des noms** : l’app repère l’aliment principal (« Petits pains au beurre » = du pain,
  « Yaourt à la fraise » = un yaourt, « Filet de saumon » = du saumon) et **devine la catégorie** pendant la saisie.
- **Illustrations automatiques** : photo vérifiée pour ~60 aliments courants, recherche Wikipédia pour les autres,
  icône de catégorie en repli (hors ligne, désactivé ou introuvable).
- **Liste de courses** (onglet Courses) : articles regroupés par rayon, suggestions « À racheter ? » tirées de
  l’historique (jamais ce qui finit surtout à la poubelle), ingrédients manquants d’une recette en un toucher,
  partage de la liste (Messages, Notes…), et « Ranger » ouvre le formulaire pré-rempli pour l’ajouter au frigo.
- **Ticket de caisse** : photo du ticket (ou image de la galerie), texte lu **sur le téléphone** (Apple Vision /
  ML Kit, rien n’est envoyé), articles proposés avec rayon, emplacement et date estimée ; on coche, on corrige,
  tout est ajouté d’un coup et les articles achetés quittent la liste de courses. Nécessite une version compilée
  (absent d’Expo Go).
- **Date lue sur l’emballage** : bouton appareil photo à côté de la date ; l’app repère « à consommer jusqu’au »
  ou « de préférence avant fin 10/2027 » et écarte les dates de fabrication et numéros de lot.
- **Photo personnelle** du produit (appareil photo ou galerie, recadrée) : gardée dans le dossier privé de l’app,
  référencée par un chemin relatif (`local:photos/…`) pour survivre aux mises à jour iOS ; les photos orphelines
  sont supprimées au démarrage.
- **Widget d’écran d’accueil** (iOS et Android) « À consommer vite » : petit, moyen et écran verrouillé ; affiche les
  produits pressés avec leur échéance, se met à jour à chaque changement et chaque nuit à minuit sans ouvrir
  l’app (une semaine d’affichage est préparée d’avance). Toucher le widget ouvre SmartFridge.
- **Impact et badges** (onglet Bilan) : nourriture sauvée, CO₂ évité et équivalent en km de voiture
  (estimations à partir des quantités saisies et de moyennes par catégorie), série « jours sans rien jeter »,
  10 badges (premier sauvetage, semaine zéro déchet, chef anti-gaspi…) avec le prochain objectif et sa progression.
- **Petits plus du quotidien** : idée de recette pour ce soir sur l’accueil (celle qui sauve le plus de produits
  urgents), alerte douce quand le produit saisi est déjà au frigo, date suggérée d’après vos achats précédents
  du même produit, annulation d’un ajout par ticket en un geste, articles de courses modifiables (appui long).
- **Rappels locaux** réglables, regroupés : une seule notification par jour cite tous les produits concernés
  (« 4 produits périment demain : Beurre, Crème, Lait et 1 autre ») : la veille, 2 ou 3 jours avant, à 8 h, 9 h, 12 h, 18 h ou 20 h.
- **Bilan** par période : score anti-gaspi (anneau animé), indicateurs avec évolution par rapport à la période
  précédente, conseil personnalisé (produit jeté à répétition), graphique 6 mois en produits ou en euros,
  catégories les plus jetées, historique filtrable et paginé.
- **Recettes** : 38 recettes anti-gaspi illustrées (plats, desserts, soupes, bases maison), avec ingrédients
  structurés et **portions ajustables** (quantités recalculées et arrondies : « 1 ½ œuf », « 130 g de farine »).
  Chaque ingrédient indique le produit du frigo qui convient (« Vous avez : Lait demi écrémé »). Classement selon
  les produits urgents et la part d’ingrédients déjà disponibles ; sections « À cuisiner en priorité »,
  « Prêtes à cuisiner », « Cuisinées récemment » ; recherche (titre ou ingrédient) et filtres (prêtes, favoris,
  ≤ 20 min, végé, desserts). **Mode cuisine** plein écran : une étape à la fois en grand, minuteur proposé quand
  l’étape indique une durée, écran maintenu allumé, puis « J’ai cuisiné » qui marque les produits utilisés.
  Favoris et historique sont gardés sur le téléphone (et dans la sauvegarde) ; les ingrédients manquants partent
  dans la liste de courses avec leur quantité.
- **Conseils** : comparatif DLC / DDM mis en avant, grille de fiches illustrées, page de détail.
- **Réglages** : thème clair / sombre / automatique, illustrations, rappels, seuil « à consommer vite »,
  sauvegarde / restauration JSON, cache d’images, effacement des données.
- **Mode sombre** complet, mise en page adaptée à la tablette, présentation au premier lancement,
  retours haptiques, icône et écran de démarrage dédiés.

## Démarrer

Prérequis : Node 20+, et Xcode (iOS) ou Android Studio / JDK 17 (Android).

```bash
npm install             # applique aussi les correctifs de patches/ (patch-package)
npx expo run:ios        # simulateur iOS : ni compte Apple ni signature nécessaires
npx expo run:android    # émulateur ou téléphone Android branché
```

**Expo Go ne suffit plus** : l’app embarque des modules natifs (achats intégrés, widgets, icônes
alternatives). Il faut une version de développement, construite par les commandes ci-dessus ou par
`npx eas-cli@latest build --profile development`. Les dossiers `ios/` et `android/` sont générés
(`npx expo prebuild`) et ne sont pas versionnés : ne les modifiez pas à la main, passez par `app.json`
et les plugins (`plugins/`).

### Travailler à plusieurs

Chaque membre peut utiliser sa propre IA de code : les règles du projet pour les IA sont dans
[`AGENTS.md`](AGENTS.md) (lu directement par Codex, Cursor et la plupart des outils ; `CLAUDE.md`, `GEMINI.md` et
`.github/copilot-instructions.md` y renvoient).

1. Cloner le dépôt, puis `npm install`.
2. Créer une branche par sujet : `git switch -c ma-fonction`.
3. Avant de pousser : `npm run typecheck && npm run lint && npm test`.
4. Pousser la branche et ouvrir une pull request vers `main` ; un autre membre relit avant la fusion.

Installer sur **son propre iPhone** avec un compte Apple gratuit : l’identifiant `app.smartfridge.mobile`
est déjà pris par un autre compte. Changez-le **localement** (`ios.bundleIdentifier` dans `app.json`,
par exemple `app.smartfridge.prenom`) sans commiter ce changement, puis `npx expo run:ios --device`.
Le simulateur et Android n’ont pas cette contrainte.

### Sur le simulateur iOS (Mac)

Prérequis : Xcode installé et sélectionné (`sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`),
puis un simulateur iOS (`xcodebuild -downloadPlatform iOS`) et `npx expo run:ios`.

Le simulateur n’a pas de caméra : pour tester le retour du scanner, lancer
`xcrun simctl openurl booted "smartfridge://product/new?barcode=3017620422003&scanId=1"`.
Avec un clavier AZERTY, la frappe « matérielle » du simulateur envoie é, à… au lieu des chiffres :
utiliser le pavé numérique à l’écran (⌘K) pour saisir un code-barres.
Contrôles qualité :

```bash
npm run typecheck       # TypeScript strict
npm run lint            # ESLint (config Expo)
npm test                # tests unitaires de la logique métier (jest-expo)
npx expo-doctor         # compatibilité des dépendances
```

L’app ne contient aucune donnée de démonstration : elle démarre avec un frigo vide.
Le jeu de produits `src/__fixtures__/demoProducts.ts` ne sert qu’aux tests automatisés.

### Sur un émulateur Android (Mac)

Prérequis installés une fois : JDK 17 (`brew install openjdk@17`), SDK Android dans `~/Library/Android/sdk`
(platform-tools, emulator, Android 36, image système arm64) et un émulateur `SmartFridge_Pixel`.

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home ANDROID_HOME=$HOME/Library/Android/sdk
$ANDROID_HOME/emulator/emulator -avd SmartFridge_Pixel &
npx expo run:android --variant release
```

Le widget iOS passe par `expo-widgets` et le widget Android par `react-native-android-widget` (`src/widgets/android`) ; ils partagent les mêmes données (`src/features/widget/widgetData.ts`).

### Distribuer une bêta (TestFlight)

Tout est configuré (`app.json`, `eas.json`). La marche à suivre, les textes à copier dans App Store Connect
et la politique de confidentialité sont dans [`TESTFLIGHT.md`](TESTFLIGHT.md) et [`PRIVACY.md`](PRIVACY.md).
Pour la publication sur l’App Store et Google Play (fiche, questionnaires de confidentialité, visuels,
liste de contrôle avant envoi) : [`STORE.md`](STORE.md).

```bash
npx eas-cli@latest build --platform ios --profile beta --auto-submit
```

## Architecture

```
src/
├── app/                        Routes Expo Router (écrans uniquement)
│   ├── _layout.tsx             Providers (SQLite, réglages, thème, images, produits, toasts) + Stack
│   ├── (tabs)/                 Mon frigo, Recettes, Bilan, Conseils
│   ├── product/new.tsx         Ajout (modal) — reçoit le code scanné ou un produit à racheter
│   ├── product/[id]/index.tsx  Fiche produit : compte à rebours, gestes anti-gaspi, recettes
│   ├── product/[id]/edit.tsx   Modification / suppression
│   ├── recipe/[id].tsx         Fiche recette + « J’ai cuisiné ! »
│   ├── tip/[id].tsx            Fiche conseil
│   ├── scan.tsx                Scanner de code-barres (plein écran)
│   ├── settings.tsx            Réglages (modal)
│   └── onboarding.tsx          Présentation au premier lancement
├── theme/                      Jetons clair / sombre, AppThemeProvider, makeStyles
├── components/
│   ├── ui/                     Button, IconButton, Chip, SegmentedControl, Fab, ProgressRing, Toast, Screen…
│   ├── home/                   UrgencySummary, PriorityCarousel, ProductRow
│   ├── form/                   BarcodeLookup, CategoryGrid, DateField, QuickAdd, FormField
│   ├── charts/                 ScoreCard, KpiCard, MonthlyChart, CategoryWasteList
│   ├── recipes/                RecipeTile, RecipeImage
│   └── FoodImage, ProductForm, ExpiryBadge, EmptyState, TipCard, HistoryItem…
├── features/
│   ├── products/               ProductsProvider, useProductForm, useProductActions, smartActions
│   ├── images/                 ImagesProvider (catalogue → Wikipédia → cache SQLite)
│   ├── recipes/                Matching recettes ↔ produits, ingrédients en stock
│   ├── settings/               SettingsProvider, useDataActions (sauvegarde, effacement)
│   └── feedback/               Toasts avec « Annuler »
├── services/                   notifications, backup, openFoodFacts, images (Wikimedia)
├── storage/database.ts         SQLite + migrations (v3 : date d’ouverture, cache d’images)
├── repositories/               Produits, réglages, cache d’images
├── hooks/                      useInventory, useLayout, useToday, useDebouncedValue…
├── utils/                      Dates, péremption, recherche, prix, statistiques, haptique
├── constants/catalog.ts        Catégories (couleurs clair / sombre), emplacements
├── data/                       Recettes, conseils, conservation, photos vérifiées, conseils ciblés
├── types/  __fixtures__/  __tests__/
```

Flux de données : **écran → hook/feature → repository (SQLite)**, puis relecture complète et
réalignement des notifications. Les composants n’accèdent jamais directement à la base.

## Choix techniques

| Sujet | Choix | Pourquoi |
| --- | --- | --- |
| Navigation | Expo Router (fichiers dans `src/app`) | Standard Expo, routes typées, modals natives |
| Stockage | `expo-sqlite` | Requêtes, index, transactions et migrations versionnées ; base solide pour une future synchro |
| Dates | Chaînes `YYYY-MM-DD` + calculs via `Date.UTC` | Une date de péremption est un jour calendaire, pas un instant : aucun décalage de fuseau ni bug de changement d’heure |
| Montants | Calculs en centimes | Pas d’erreurs d’arrondi flottant (0,1 + 0,2) |
| Notifications | Diff entre rappels souhaités et planifiés | Idempotent : pas de doublon ni de rappel orphelin, quelle que soit l’action |
| Scan | `CameraView` d’`expo-camera` | `expo-barcode-scanner` est retiré des SDK récents |
| Images | `expo-image` avec cache disque | La photo reste visible hors ligne une fois chargée |
| État UI | Context React + hooks | Suffisant pour deux agrégats (produits, réglages) ; pas de dépendance supplémentaire |
| Réglages | Table `settings` clé / valeur JSON (migration v2) | Validés à la lecture : une valeur corrompue retombe sur la valeur par défaut |
| Sauvegarde | Fichier JSON versionné, feuille de partage système | L’utilisateur choisit la destination ; aucune donnée envoyée automatiquement |
| Thème | Jetons sémantiques clair / sombre + `makeStyles` | Aucun composant ne référence une couleur en dur ; le mode sombre utilise ses propres teintes, pas une inversion |
| Graphiques | Vues React Native + `react-native-svg` (anneau) | Couleurs bleu / orange validées pour le daltonisme en clair **et** en sombre (le vert / rouge échoue en deutéranopie) |
| iOS 27 | Plugin `plugins/withSceneLifecycle.js` | Branche le délégué de scène fourni par Expo : le SDK iOS 27 exige le cycle de vie par scènes |
| Noms d’aliments | Analyseur dédié (`utils/foodName.ts`) | L’aliment principal précède « au / de / à la » ; noms composés (« pomme de terre », « pâte à tartiner ») et contenants (« filet de », « pot de ») gérés. Utilisé par les images, les recettes, les ingrédients en stock et la catégorie devinée |
| Illustrations | Catalogue vérifié → Wikipédia → icône | Les ~60 aliments courants ont une photo choisie à la main ; la recherche rejette les homonymies (« Gaz moutarde ») |

### Notifications

- Permission demandée au **premier ajout de produit** (moment où elle a du sens), pas au lancement.
- Un rappel par produit actif, **la veille à 9 h** par défaut (réglable) : « {nom} périme demain ! ».
- Changer un réglage reprogramme immédiatement tous les rappels ; le nombre de rappels programmés est affiché dans les réglages.
- Identifiant déterministe `expiry-{id}` + signature (date, titre) stockée dans `data` :
  à chaque mutation et au démarrage, `syncExpiryReminders` annule ce qui n’est plus voulu et planifie ce qui manque.
- Produits périmés ou rappel déjà passé (ex. produit ajouté l’après-midi pour une péremption le lendemain) : pas de notification,
  le bandeau orange de l’accueil prend le relais.
- Toucher une notification ouvre la fiche du produit.

### Open Food Facts

`GET https://world.openfoodfacts.org/api/v2/product/{code}?fields=…` avec timeout de 8 s.
`product_name_fr` puis `product_name`, première marque, image HTTPS uniquement, `quantity`,
`categories_tags` mappés du plus précis au plus général, symbole ℮ retiré de la quantité.
La recherche part automatiquement dès qu’un EAN-13 complet est saisi. Introuvable, hors ligne ou en erreur :
message clair et saisie manuelle sans blocage. Les données déjà saisies par l’utilisateur ne sont jamais écrasées.

## Limites connues

- **iOS : 64 notifications locales en attente maximum.** SmartFridge planifie les 60 rappels les plus proches ;
  les suivants sont planifiés automatiquement au fil des ouvertures et des modifications.
- **Android 12+ :** sans la permission `SCHEDULE_EXACT_ALARM`, le système peut retarder légèrement un rappel.
  C’est acceptable pour un rappel la veille, donc la permission n’est pas demandée.
- **Expo Go sur Android** affiche un avertissement sur les notifications *push* (distantes) : il ne concerne pas
  les notifications locales utilisées ici.
- La lecture des tickets est une heuristique : formats très différents, tickets froissés ou abréviations
  (« YAOURT NAT ») peuvent demander une correction ; l’utilisateur relit toujours la liste avant l’ajout.
- Pour un produit hors catalogue, la photo Wikipédia est la meilleure correspondance trouvée : elle peut être
  approximative (ex. un plat générique). L’icône de catégorie s’affiche si rien de pertinent n’est trouvé.
- La couverture d’Open Food Facts varie : certains produits (frais, à la coupe, marques locales) sont absents ou incomplets.
- Les durées suggérées pour la date de péremption sont indicatives et prudentes ; l’app rappelle de vérifier l’emballage.
- La sauvegarde ne contient pas les photos : seulement l’adresse des photos Open Food Facts ; les photos
  personnelles restent sur le téléphone.
- Testé par TypeScript strict, ESLint, `expo-doctor`, tests unitaires et export des bundles iOS / Android ;
  à valider sur appareil réel (scan, notifications) avant publication.

## Évolutions possibles (non implémentées)

- V2 : synchronisation cloud multi-appareils (le schéma, les identifiants texte et `updatedAt` sont prêts pour une stratégie de synchro), puis offre premium.
