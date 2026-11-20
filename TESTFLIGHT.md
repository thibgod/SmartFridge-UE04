# Mettre SmartFridge sur TestFlight

Ce guide permet d’envoyer SmartFridge à tes amis via TestFlight. Le projet est déjà configuré
(`app.json`, `eas.json`) : il reste les étapes qui demandent **tes** comptes et **ton** mot de passe Apple.

Compte environ 30 minutes la première fois, plus le délai de vérification d’Apple (souvent moins de 24 h).

---

## 1. Prérequis (une seule fois)

| Quoi | Où | Coût |
| --- | --- | --- |
| Compte **Apple Developer Program** | <https://developer.apple.com/programs/> | 99 €/an |
| Compte **Expo** (EAS Build) | <https://expo.dev/signup> | gratuit (quota de builds limité par mois) |

L’inscription Apple peut prendre de quelques heures à 2 jours (vérification d’identité).

## 2. Choisir l’identifiant de l’app

Dans `app.json`, l’identifiant iOS est `app.smartfridge.mobile`. Il doit être **unique chez Apple**.
S’il est refusé (« already in use »), remplace-le par un identifiant à ton nom, par exemple :

```json
"bundleIdentifier": "com.tonprenom.smartfridge"
```

(et la même valeur dans `android.package` pour rester cohérent).

## 3. Construire et envoyer la build

Depuis le dossier du projet :

```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest build --platform ios --profile beta --auto-submit
```

Le profil `beta` affiche dans l’app la rubrique « Version bêta » (comment envoyer un commentaire) ;
la version destinée à l’App Store utilise le profil `production`, sans cette rubrique.

La commande te guide :

1. **Projet EAS** : accepte la création du projet (« Create a new project »).
2. **Bundle identifier** : confirme celui de `app.json`.
3. **Chiffrement** : l’app n’utilise que le chiffrement standard (HTTPS) ; c’est déjà déclaré
   (`usesNonExemptEncryption: false`), tu n’auras pas la question d’export à chaque build.
4. **Connexion Apple** : identifiant, mot de passe, code de double authentification.
   Laisse EAS **créer les certificats et profils** (réponds « Yes »).
5. **Nom de l’app sur App Store Connect** : si « SmartFridge » est déjà pris sur l’App Store,
   choisis par exemple « SmartFridge Anti-gaspi ». Le nom affiché sous l’icône du téléphone reste « SmartFridge ».
6. La build se fait dans le cloud Expo (10 à 20 min), puis elle est envoyée à App Store Connect.

À la fin, la build apparaît dans App Store Connect → ton app → **TestFlight** après le traitement par Apple
(5 à 30 min). Tu reçois un e-mail quand elle est prête.

## 4. Inviter tes amis

### Option rapide : lien public (recommandé)

1. App Store Connect → **TestFlight** → **Informations de test** : remplis les champs avec les textes de la
   section 6 (description, adresse e-mail de retour, coordonnées pour la vérification Apple).
2. **Tests externes** → **+** → crée un groupe « Amis ».
3. Ajoute la build au groupe, puis **Soumettre pour vérification** (première build seulement : Apple la
   vérifie, en général en moins de 24 h).
4. Une fois validée : **Activer le lien public**, éventuellement avec une limite (ex. 30 testeurs).
5. Envoie le lien à tes amis.

### Côté amis

1. Installer l’app **TestFlight** depuis l’App Store.
2. Ouvrir ton lien sur l’iPhone → **Accepter** → **Installer**.
3. Pour signaler un bug : faire une **capture d’écran** dans SmartFridge, TestFlight propose alors
   « Partager un commentaire ». (L’app le rappelle dans Réglages → Version bêta.)

> Les testeurs « internes » (jusqu’à 100 personnes ajoutées à ton équipe App Store Connect) n’ont pas besoin
> de la vérification Apple, mais il faut leur créer un accès à ton compte : pour des amis, le lien public est plus simple.

## 5. Publier une nouvelle version

Après une modification du code :

```bash
npx eas-cli@latest build --platform ios --profile beta --auto-submit
```

Le numéro de build s’incrémente tout seul (`autoIncrement`). Ajoute la nouvelle build au groupe « Amis » :
les builds suivantes d’une même version passent en général sans nouvelle vérification complète.
Pense à monter `version` dans `app.json` (ex. `1.0.1`) pour les changements importants.

Une build TestFlight expire **90 jours** après son envoi.

## 6. Textes à copier dans App Store Connect

**Description de la bêta (obligatoire)**

> SmartFridge vous aide à moins gaspiller : notez ce qu’il y a dans votre frigo, congélateur et placard
> (à la main ou en scannant le code-barres), recevez un rappel avant la date de péremption, trouvez une
> recette pour cuisiner ce qui doit l’être et suivez l’argent économisé. Vos données restent sur votre téléphone :
> pas de compte, pas de publicité.

**Quoi tester**

> - Ajoutez 5 à 10 produits de votre frigo (scan du code-barres et saisie à la main).
> - Vérifiez que la photo et la catégorie proposées sont justes.
> - Acceptez les notifications et dites-nous si le rappel arrive bien la veille.
> - Marquez des produits « Consommé » / « Jeté » et regardez l’onglet Bilan.
> - Testez une recette avec « J’ai cuisiné ! ».
> - Remplissez la liste de courses, puis photographiez un vrai ticket de caisse (onglet Courses).
> Tout retour est bienvenu : capture d’écran → « Partager un commentaire ».

**Adresse e-mail de retour** : ton adresse.

**Informations pour la vérification Apple (Beta App Review)**
- Coordonnées : ton nom, ton e-mail, ton téléphone au format international (`+33 6…`).
- Connexion requise : **non** (l’app n’a pas de compte).
- Notes :
  > Application 100 % locale, sans compte. Pour tester : bouton « + Ajouter », saisir un nom (ex. « Yaourts »)
  > et une date. Le scan utilise l’appareil photo uniquement pour lire les codes-barres.

**Politique de confidentialité** : si App Store Connect la demande, le texte prêt à publier est dans
[`PRIVACY.md`](PRIVACY.md). Héberge-le où tu veux (page GitHub, Notion publique…) et colle son adresse.

## 7. Ce qui a été préparé dans le projet

- `app.json` : version `1.0.0`, build `1`, iPhone uniquement (pas de captures iPad à fournir),
  chiffrement standard déclaré, manifeste de confidentialité Apple (`privacyManifests`), textes d’autorisation
  en français, icône et écran de démarrage.
- `eas.json` : profils `beta` (TestFlight, rubrique « Version bêta » visible) et `production` (App Store),
  numéro de build automatique, compilés avec
  **Xcode 27.1** (image EAS `macos-tahoe-26.6-xcode-27.1`, fixée pour que chaque build soit identique) : seul le
  SDK iOS 27.1 permet à l’app de remplir l’écran déplié de l’**iPhone Duo** (vérifié dans son simulateur) ;
  profil `preview` pour une installation directe sur un iPhone enregistré.
- `plugins/withSceneLifecycle.js` : adopte le cycle de vie iOS par scènes, **obligatoire avec le SDK iOS 27**
  (sans lui, l’app compilée avec Xcode 27 se ferme dès le lancement). Vérifié par une build Release locale
  avec Xcode 27 : l’app démarre et fonctionne.
- Données de démonstration **retirées de l’app** : tes amis démarrent avec un frigo vide.
- Réglages → **Version bêta** : explique comment envoyer un commentaire, et affiche la version + le numéro de build
  (ex. « 1.0.0 (3) ») pour savoir sur quelle build porte un retour.

Pour la sortie sur l’App Store : construire avec le profil `production` (la rubrique bêta disparaît
d’elle-même) et suivre [STORE.md](STORE.md) pour la fiche, la confidentialité et les visuels.
