# AGENTS.md — guide pour les assistants de code (IA)

Ce fichier s’adresse à **toute IA de code** (Claude Code, Codex, Cursor, Copilot, Gemini…) qui travaille
sur SmartFridge. Lis-le en entier avant ta première modification : il résume ce qui ne se devine pas en
lisant le code. Plusieurs personnes travaillent en même temps sur ce dépôt, chacune avec sa propre IA.

Langue du projet : **français** (interface, commentaires, documentation, messages de commit). Le code
(noms de variables, fonctions, fichiers) est en anglais.

---

## 1. Le produit en bref

SmartFridge est une app mobile anti-gaspillage (iPhone et Android) : on enregistre ce qu’il y a dans son
frigo, son congélateur et son placard, l’app prévient avant la date de péremption, propose des recettes
avec ce qui doit être consommé vite et montre un Bilan (argent économisé, score, impact CO₂).

Fonctions : saisie manuelle, scan de code-barres (Open Food Facts), lecture d’un ticket de caisse et de la
date sur l’emballage (sur le téléphone), photos, rappels locaux, liste de courses, 38 recettes avec mode
cuisine, Bilan avec graphiques et badges, widgets iOS et Android, sauvegarde / restauration.

**SmartFridge Premium** (abonnement) : voir [PREMIUM.md](PREMIUM.md). Limites gratuites : 30 produits,
15 recettes sur 38, 3 tickets par mois, widget et Bilan détaillé réservés. Premium ajoute aussi plusieurs
lieux (frigo du bureau…), la sauvegarde automatique, les couleurs et icônes d’app, l’export PDF / CSV.

### Règles produit non négociables

- Le nom est **SmartFridge**, jamais autre chose (pas « FrigoMalin » ni de traduction).
- **100 % local** : pas de compte, pas de serveur SmartFridge, aucune mesure d’audience, aucun traceur,
  aucune publicité. Les seuls services contactés sont Open Food Facts (code-barres) et Wikimedia
  (illustrations), décrits dans la politique de confidentialité. Toute nouvelle sortie réseau doit être
  validée par l’équipe **et** ajoutée à `src/data/privacy.ts`.
- Achats **natifs uniquement** (StoreKit 2 / Google Play Billing via `expo-iap`), sans service tiers.
- Fin d’abonnement : **rien n’est perdu**. On bloque les nouveaux ajouts au-delà des limites et les
  fonctions Premium, jamais la consultation ni la modification de l’existant.
- L’offre Premium s’affiche quand on touche une limite et dans Réglages, **jamais imposée** (pas
  d’écran d’offre au lancement).
- Les limites et les prix sont des décisions d’équipe : ne les change pas sans qu’on te le demande.

---

## 2. Pile technique

- **Expo SDK 57**, React Native 0.86, React 19.2, TypeScript 6 en mode strict
  (`noUncheckedIndexedAccess` activé : un accès `tableau[i]` peut être `undefined`).
- **Expo Router** (routes dans `src/app/`), alias d’import `@/` → `src/`.
- **expo-sqlite** pour toutes les données, migrations par `PRAGMA user_version`.
- **Reanimated 4** + **react-native-gesture-handler** pour les animations et le balayage des lignes.
- Tests : **Jest** (preset `jest-expo`), sur la logique pure.
- Build : **EAS** (`eas.json`, profils `development`, `preview`, `beta`, `production`).

### Expo change à chaque version : ne te fie pas à ta mémoire

Avant d’écrire du code qui touche une API Expo, EAS ou React Native :

1. Vérifie la version majeure d’`expo` dans `package.json` (aujourd’hui 57).
2. Lis la documentation de cette version : `https://docs.expo.dev/versions/v57.0.0/`
3. Pour le reste : `https://docs.expo.dev/llms.txt` (index de toute la doc, avec les erreurs fréquentes des IA).

### Installation et lancement

```bash
npm install             # lance aussi patch-package (dossier patches/)
npx expo run:ios        # simulateur iOS
npx expo run:android    # émulateur ou téléphone Android
```

**Expo Go ne fonctionne pas** : l’app contient des modules natifs (achats intégrés, widgets, icônes
alternatives). Il faut une version de développement (`npx expo run:*` ou `eas build --profile development`).

---

## 3. Règles de travail en équipe (à respecter strictement)

1. **Jamais de commit directement sur `main`.** Une branche par sujet (`git switch -c nom-du-sujet`),
   puis une pull request. Ne force jamais un push (`--force`) sur une branche partagée.
2. **Petites modifications ciblées.** Ne reformate pas, ne renomme pas et ne déplace pas des fichiers
   sans rapport avec ta tâche : les autres travaillent en même temps et tu créerais des conflits.
3. **Avant de déclarer une tâche terminée**, lance et fais passer :
   ```bash
   npm run typecheck && npm run lint && npm test
   ```
   Si tu ajoutes ou modifies des dépendances, lance aussi `npx expo-doctor`.
4. **Nouvelle logique = nouveau test** dans `src/__tests__/` (voir § 6).
5. **Ajouter une dépendance** : toujours `npx expo install <paquet>` (jamais `npm install <paquet>`),
   qui choisit la version compatible avec le SDK. Préfère un module Expo officiel ; demande avant
   d’ajouter une bibliothèque lourde.
6. **Ne commite jamais** de secret (clés, mots de passe, `.env`), ni les dossiers `ios/`, `android/`,
   `node_modules/` (ils sont ignorés).
7. **Ne change pas** l’identifiant de l’app (`ios.bundleIdentifier`, `android.package` dans `app.json`)
   dans un commit. Pour installer sur son propre iPhone avec un compte Apple gratuit, on le change
   **localement** sans le commiter (voir README).
8. Tiens à jour [ROADMAP.md](ROADMAP.md) (✅ fait · ⬜ à faire) quand tu termines un élément, et
   [PREMIUM.md](PREMIUM.md) si tu touches à Premium.
9. Format : Prettier avec `--single-quote --print-width 130 --trailing-comma all`. Formate seulement
   les fichiers que tu modifies :
   ```bash
   npx prettier --single-quote --print-width 130 --trailing-comma all --write <fichiers>
   ```

---

## 4. Carte du dépôt

```
index.ts                  Point d’entrée : Expo Router + tâche du widget Android
app.json                  Configuration Expo et plugins (source de vérité pour iOS / Android)
plugins/                  Plugins Expo maison (voir § 8)
patches/                  Correctifs de dépendances appliqués par patch-package
scripts/                  Scripts ponctuels (crédits photo, génération des icônes)
store/                    Captures et visuels des stores
assets/                   Icônes, icônes alternatives, aperçu du widget
src/
  app/                    ÉCRANS uniquement (Expo Router) — chaque fichier est une route
    (tabs)/               Onglets : index (Mon frigo), shopping, recipes, stats (Bilan), tips
    product/new.tsx       Ajout ; product/[id]/index.tsx fiche ; product/[id]/edit.tsx
    recipe/[id]/          Fiche recette et mode cuisine (cook.tsx)
    premium.tsx           Écran d’offre ; settings.tsx Réglages ; places.tsx Mes lieux
    _layout.tsx           Fournisseurs (providers) et pile de navigation
  components/             Composants réutilisables (ui/ = boutons, écran, toast, FAB…)
  features/<domaine>/     Logique par domaine : Provider (état React) + fonctions pures
  repositories/           Accès SQLite, une table = un dépôt
  services/               Accès natif ou réseau (notifications, fichiers, widget, Open Food Facts…)
  storage/database.ts     Schéma et migrations SQLite
  theme/                  Couleurs, espacements, typographie, makeStyles, accents
  types/                  Types partagés (Product, AppSettings…)
  utils/                  Fonctions pures (dates, prix, statistiques, texte…)
  data/                   Données statiques (recettes, conseils, durées de conservation, confidentialité)
  constants/              Catalogues (catégories, emplacements), réglages de l’app
  widgets/                Widget iOS (ExpiringWidget.tsx) et Android (widgets/android/)
  __tests__/              Tests Jest
```

Règle : **aucun fichier non-route dans `src/app/`** (sinon Expo Router en fait un écran).

### Ordre des fournisseurs (`src/app/_layout.tsx`)

SQLite → Settings → Premium → Thème → Images → Products → Places → Shopping → RecipeLog → Toast,
puis la pile de navigation et `AutoBackupRunner`. Un fournisseur ne peut utiliser que ceux qui
l’entourent : par exemple `PlacesProvider` peut lire les produits, pas l’inverse.

### Où se trouve quoi

| Sujet | Fichiers |
| --- | --- |
| Produits (ajout, fermeture, annulation) | `features/products/ProductsProvider.tsx`, `useProductActions.ts`, `useProductForm.ts` |
| Inventaire de l’accueil | `hooks/useInventory.ts`, `components/home/` |
| Lieux (Premium) | `features/places/` (`MAIN_PLACE` = « maison », `place_id` NULL en base) |
| Premium | `features/premium/limits.ts` (limites), `plans.ts` (formules), `PremiumProvider.tsx` |
| Rappels | `services/notifications.ts` |
| Recettes | `data/recipes.ts`, `features/recipes/recipeMatching.ts` |
| Bilan | `utils/stats.ts`, `utils/impact.ts`, `features/achievements/`, `features/stats/` (exports) |
| Sauvegardes | `services/backup/format.ts` (format, version), `files.ts` / `files.web.ts`, `features/backup/` |
| Widgets | `features/widget/widgetData.ts` (données communes), `widgets/` |
| Confidentialité | `src/data/privacy.ts` → génère `PRIVACY.md` |

---

## 5. Conventions de code

### Interface

- Tout texte visible est en **français**, avec la typographie française : apostrophe courbe `’`,
  guillemets `« … »` avec espaces, espace avant `:`. Tutoiement **interdit** dans l’app : on vouvoie.
- Styles : `makeStyles` + jetons du thème, jamais de couleur codée en dur dans un écran :
  ```tsx
  import { makeStyles, spacing, radius, fontSize, useTheme } from '@/theme';
  const useStyles = makeStyles(({ colors }) => ({
    card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  }));
  ```
  Couleurs disponibles : `colors.primary`, `surface`, `text`, `textMuted`, `danger`, `success`… (voir
  `theme/tokens.ts`). `primary` suit la couleur d’accent choisie par l’utilisateur : ne la remplace pas
  par une valeur fixe. Mode sombre géré automatiquement par le thème.
- Éléments touchables : `Pressable` avec retour visuel `pressed && PRESSED`, zone d’au moins
  `MIN_TOUCH` (44 pt), `accessibilityRole` et `accessibilityLabel` en français.
- Taille de texte : limiter l’agrandissement des éléments d’interface avec
  `maxFontSizeMultiplier={CHROME_FONT_SCALE}` (titres : `HEADING_FONT_SCALE`).
- Retours : `haptics.select()` / `success()` / `warning()` (`utils/haptics.ts`) ; messages courts avec
  `showToast({ tone, message })` (`features/feedback/ToastProvider`).
- Animations : Reanimated, toujours en respectant « Réduire les animations » (`useReducedMotion`).
- Marges latérales : utiliser `useLayout()` (gère l’iPhone pliable et les grands écrans).

### Logique et données

- **Dates** : une date de péremption est une `LocalDateString` (`AAAA-MM-JJ`, heure locale). Les
  horodatages (`addedAt`, `closedAt`) sont en ISO. Utilise `utils/date.ts` (`daysUntil`, `addDays`,
  `formatShortDate`…) : n’écris pas ton propre calcul de dates.
- **Prix** : en euros dans `Product.price` ; calculs en centimes dans les statistiques (`utils/price.ts`).
- Mets la logique dans des **fonctions pures** (`utils/`, `features/*/xxx.ts`), testables sans React ;
  les composants et fournisseurs ne font que l’appeler.
- Code propre à une plateforme : fichier `xxx.web.ts` pour le web, `Platform.OS` sinon. Les modules
  natifs optionnels sont chargés de façon prudente (`import()` ou `require` dans un `try`) pour que
  l’app ne plante pas là où ils manquent.

### Base de données

- Schéma dans `src/storage/database.ts`, tableau `MIGRATIONS` (version actuelle : **v8**).
- **Ne modifie jamais une migration existante.** Pour changer le schéma, **ajoute** une entrée à la fin
  (v9…). Toute la base des utilisateurs en dépend.
- Lecture / écriture uniquement via `src/repositories/`.
- Si tu ajoutes une donnée, pense à la **sauvegarde** : `services/backup/format.ts` (incrémente
  `BACKUP_VERSION`, garde la lecture des anciennes versions, ajoute un test dans `backup.test.ts`).

### Réglages

Pour ajouter un réglage : `src/types/settings.ts` (type + `DEFAULT_SETTINGS`), puis la validation dans
`src/repositories/settingsRepository.ts`. Si le réglage est propre à ce téléphone (état d’abonnement,
quotas, lieu affiché…), ajoute-le à `withoutLocalOnly` dans `services/backup/format.ts` pour qu’il ne
parte pas dans les sauvegardes.

### Premium

- Toujours passer par `usePremium()` (`isPremium`, `showPaywall(raison)`) et les fonctions de
  `features/premium/limits.ts`. Ne duplique jamais une limite en dur.
- Une sauvegarde importée ne doit **jamais** accorder Premium ni remettre les quotas à zéro (testé).
- Pour tester Premium sans achat réel, on force temporairement l’état dans `PremiumProvider.tsx`
  avec un marqueur `// TEMPORAIRE-TEST-PREMIUM`. **Ne commite jamais ce marqueur** :
  `grep -rn TEMPORAIRE src` doit être vide avant un commit.

---

## 6. Tests

```bash
npm test                         # tous les tests
npx jest places                  # un fichier (par nom)
```

- Les tests couvrent la logique pure : dates, statistiques, limites Premium, sauvegardes, recettes,
  ticket de caisse, widget, exports… Un écran n’est pas testé directement : extrais sa logique.
- `legal.test.ts` vérifie que `PRIVACY.md` est identique au texte de l’app. Après une modification de
  `src/data/privacy.ts`, régénère-le avec `UPDATE_PRIVACY=1 npx jest legal` et mets à jour
  `PRIVACY_UPDATED_AT`.
- Les tests n’accèdent ni au réseau ni aux modules natifs.

---

## 7. Fichiers à ne pas modifier à la main

- `ios/`, `android/` : générés par `npx expo prebuild` (non versionnés). Toute configuration native
  passe par `app.json` ou un plugin de `plugins/`.
- `PRIVACY.md` : généré depuis `src/data/privacy.ts`.
- `src/data/imageCredits.ts` : généré par `node scripts/fetch-image-credits.mjs`.
- `assets/app-icons/` : générés par `swift scripts/make-alt-icons.swift` (Mac).
- `package-lock.json` : seulement via `npm` / `npx expo install`, jamais à la main.
- `expo-env.d.ts`, `.expo/` : générés.

---

## 8. Pièges connus (lis avant de déboguer)

- **Balayage des lignes sur Android** : un bug de react-native-gesture-handler rendait le bouton
  « Consommé » insensible au toucher. Il est corrigé par `patches/react-native-gesture-handler+2.32.0.patch`.
  Si `npx expo install --fix` change la version de cette bibliothèque, vérifie que le correctif
  s’applique encore (message `patch-package` à l’installation) ou qu’il n’est plus nécessaire.
- **Icônes alternatives sur Android** : changer d’icône désactive l’activité principale ; le plugin
  `plugins/withAliasDeepLinks.js` recopie les liens `smartfridge://` sur chaque icône. Il doit rester
  **avant** `expo-alternate-app-icons` dans la liste des plugins d’`app.json`.
- `plugins/withLocalNotificationsOnly.js` retire le droit « Push » : l’app n’utilise que des
  notifications locales, et ce droit empêche l’installation avec un compte Apple gratuit.
- `plugins/withSceneLifecycle.js` est obligatoire avec le SDK iOS 27 (sinon l’app s’arrête au lancement).
- Widget Android : il tourne sans l’app ouverte et relit une copie (`widget-android.json`) écrite par
  `services/widget.ts`. Sans Premium, cette copie ne contient aucun produit.
- Liens profonds : schéma `smartfridge://` (ex. `smartfridge://premium?reason=widget`).
- Le simulateur iOS n’a pas de caméra : pour tester le scan,
  `xcrun simctl openurl booted "smartfridge://product/new?barcode=3017620422003&scanId=1"`.
- Les achats intégrés ne fonctionnent pas en développement tant que les produits ne sont pas créés
  dans App Store Connect / Play Console : l’écran d’offre s’affiche, l’achat reste indisponible.

---

## 9. Documents de référence

| Document | Contenu |
| --- | --- |
| [README.md](README.md) | Présentation, installation, architecture, choix techniques |
| [ROADMAP.md](ROADMAP.md) | Ce qui est fait et ce qui reste à faire |
| [PREMIUM.md](PREMIUM.md) | Décisions et état de l’abonnement |
| [FAMILLE.md](FAMILLE.md) | Frigo partagé en famille : état de la préparation et étapes restantes |
| [STORE.md](STORE.md) | Fiches App Store / Google Play, questionnaires de confidentialité |
| [TESTFLIGHT.md](TESTFLIGHT.md) | Distribuer une bêta |
| [PRIVACY.md](PRIVACY.md) | Politique de confidentialité (générée) |
| [docs/analyse/](docs/analyse/justification.md) | Analyse UML (cours UE04, HELMo) : cas d’utilisation et diagrammes d’activité, avec leur justification ; redessinés par `python3 docs/analyse/generer_diagrammes.py` |

---

## 10. Avant de rendre la main

- [ ] Je suis sur une branche, pas sur `main`.
- [ ] `npm run typecheck && npm run lint && npm test` passent.
- [ ] Les nouveaux textes sont en français, vouvoiement, typographie française.
- [ ] Pas de couleur en dur, pas de limite Premium en dur, pas de nouvel appel réseau non déclaré.
- [ ] Aucune migration existante modifiée ; sauvegarde mise à jour si j’ai ajouté une donnée.
- [ ] `grep -rn TEMPORAIRE src` est vide.
- [ ] ROADMAP.md (et PREMIUM.md si besoin) à jour.
- [ ] J’explique à l’humain ce que j’ai vérifié **et ce que je n’ai pas pu vérifier** (par exemple :
      « testé sur simulateur iOS, pas sur Android »).
