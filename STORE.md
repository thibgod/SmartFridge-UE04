# SmartFridge — fiche App Store et Google Play

Textes prêts à copier dans App Store Connect et la Google Play Console, avec les réponses aux
questionnaires de confidentialité. Les limites de longueur sont indiquées entre parenthèses.

---

## Textes de la fiche

**Nom** (30) : `SmartFridge`

**Sous-titre App Store** (30) : `Anti-gaspi : frigo et dates`

**Description courte Google Play** (80) :
`Suivez les dates de votre frigo, recevez un rappel et cuisinez avant de jeter.`

**Texte promotionnel App Store** (170, modifiable sans nouvelle version) :
`Scannez vos courses, voyez d’un coup d’œil ce qui périme bientôt et cuisinez-le à temps. Sans compte, sans publicité : vos données restent sur votre téléphone.`

**Mots-clés App Store** (100, séparés par des virgules, sans espace) :
`anti-gaspi,frigo,péremption,DLC,DDM,courses,recettes,restes,congélateur,inventaire,ticket`

**Description** (4000) :

```
SmartFridge vous aide à consommer vos produits avant qu’ils ne périment. Moins de gaspillage, plus d’économies, sans prise de tête.

AJOUTEZ EN UN GESTE
• Scannez le code-barres : nom, photo et catégorie sont remplis tout seuls (Open Food Facts).
• Photographiez votre ticket de caisse : tous les produits sont rangés d’un coup.
• Photographiez la date sur l’emballage : elle est lue automatiquement.
• Vos habitués se rajoutent en un toucher, avec une date suggérée d’après vos achats précédents.

VOYEZ CE QUI PRESSE
• Frigo, congélateur et placard, triés par date : « Aujourd’hui », « Demain », « 3 j ».
• Un rappel la veille, à l’heure de votre choix, qui regroupe tous les produits concernés.
• Un widget d’écran d’accueil « À consommer vite » (iPhone et Android).
• Glissez un produit pour le marquer consommé ou jeté.

CUISINEZ CE QUI DOIT L’ÊTRE
• « Idée pour ce soir » : la recette qui sauve le plus de produits urgents.
• 38 recettes anti-gaspi avec portions ajustables et mode cuisine pas à pas, minuteurs compris.
• Les ingrédients manquants vont dans la liste de courses en un toucher.

FAITES VOS COURSES SANS DOUBLON
• Liste de courses par rayon, suggestions de ce que vous rachetez souvent.
• De retour du magasin, rangez vos achats au frigo directement depuis la liste.

SUIVEZ VOS PROGRÈS
• Argent économisé et perdu, score anti-gaspi, nourriture sauvée et CO₂ évité, badges.

VOS DONNÉES RESTENT CHEZ VOUS
Pas de compte, pas de publicité, pas de traceur. Votre inventaire est enregistré uniquement sur votre téléphone ; vous pouvez l’exporter ou tout effacer à tout moment.
```

**Nouveautés de la version 1.0** :
`Première version de SmartFridge.`

---

## Catégories et classification

| | App Store | Google Play |
| --- | --- | --- |
| Catégorie principale | Cuisine et boissons | Cuisine et boissons |
| Catégorie secondaire | Style de vie | — |
| Âge | 4+ (aucun contenu sensible) | Tout public (questionnaire IARC : « non » partout) |
| Prix | Gratuit, sans achat intégré | Gratuit, sans achat intégré, sans annonces |

---

## Confidentialité

### App Store — « Confidentialité de l’app »

Réponse : **Données non collectées.**

Justification : l’inventaire, la liste de courses et les réglages restent sur l’appareil. Le code-barres
(Open Food Facts) et le nom d’un produit (Wikimedia) servent uniquement à répondre à la requête, ne sont liés
à aucun utilisateur et ne sont pas conservés par le développeur. Sur iPhone, la lecture des codes-barres, des
tickets et des dates se fait avec Apple Vision, sur le téléphone. Aucun SDK d’analyse ni de publicité.

### Google Play — « Sécurité des données »

Sur Android, la lecture des codes-barres et du texte passe par **Google ML Kit**, qui fonctionne sur le
téléphone mais envoie à Google des statistiques techniques d’utilisation. Google indique quoi déclarer sur
<https://developers.google.com/ml-kit/android-data-disclosure> : **vérifiez cette page au moment de remplir
le formulaire**, elle fait foi. À la date de rédaction, cela revient à :

- Données collectées : **Infos et performances de l’app → Diagnostics** et **Appareil ou autres identifiants**,
  collectées par ML Kit, non partagées, utilisées pour l’**analyse** et la maintenance du service ML Kit ;
- Données chiffrées en transit : **oui** (HTTPS uniquement) ;
- Suppression des données : les données de l’utilisateur sont locales, supprimées avec l’app ou via
  Réglages → Données → « Tout effacer » ;
- Aucune autre donnée collectée ni partagée.

### Politique de confidentialité

Le texte est dans [PRIVACY.md](PRIVACY.md) (identique à l’écran Réglages → Confidentialité de l’app).
Les deux stores exigent **une adresse web publique** : publiez ce fichier (par exemple via GitHub Pages ou
tout hébergement statique), puis indiquez l’adresse dans les deux consoles.

**Adresse d’assistance** (obligatoire) : une page ou une adresse e-mail où les utilisateurs peuvent vous
écrire. La politique renvoie vers ce lien « Assistance » de la fiche.

---

## Notes pour la vérification Apple / Google

```
SmartFridge ne nécessite aucun compte : toutes les fonctions sont accessibles dès l’ouverture.
Pour tester rapidement : touchez « Saisir à la main », ajoutez un produit avec une date proche, puis glissez-le
vers la droite (Consommé) ou vers la gauche (Jeté). Le scan de code-barres fonctionne avec n’importe quel produit
alimentaire (ex. 3017620422003). Les notifications sont des rappels locaux programmés sur le téléphone.
```

---

## Visuels (prêts dans `store/`)

| Dossier / fichier | Format | Pour |
| --- | --- | --- |
| `store/app-store-iphone-6.9/` (7 images) | 1320 × 2868, PNG opaque | App Store, iPhone 6,9 pouces (sert aussi aux tailles inférieures) |
| `store/app-store-iphone-duo/` | 1398 × 2034, JPEG | App Store, iPhone Duo déplié : affiche le badge « optimisé pour iPhone Duo » |
| `store/google-play-phone/` (7 images) | 1080 × 1920 (9:16) | Google Play, téléphone |
| `store/google-play-banniere-1024x500.png` | 1024 × 500 | Google Play, bannière obligatoire |
| `store/google-play-icone-512.png` | 512 × 512 | Google Play, icône de la fiche |

Ordre conseillé : accueil, fiche produit, recettes, recette, mode cuisine, courses, Bilan. Les captures ont été
faites avec des données de démonstration (aucune donnée personnelle), barre d’état à 9:41.

**iPhone Duo** : l’app remplit l’écran déplié uniquement si elle est compilée avec le **SDK iOS 27.1**
(`eas.json` utilise l’image `macos-tahoe-26.6-xcode-27.1`). Une seule capture Duo est fournie (l’accueil) ;
vérifiez dans App Store Connect la taille exacte demandée pour l’iPhone Duo et ajoutez-en d’autres au besoin
depuis Device Hub (Xcode 27.1).

**iPad** : l’app est proposée sur iPad (`supportsTablet` dans `app.json`). App Store Connect exige alors des
captures **iPad 13 pouces** (2064 × 2752 en portrait ou 2752 × 2064 en paysage) : elles ne sont **pas encore
faites**. À l’horizontale, l’accueil s’affiche en deux colonnes : une capture en paysage le met en valeur.

## Avant d’envoyer une version aux stores

1. `npx tsc --noEmit`, `npx expo lint`, `npx jest`, `npx expo-doctor` : tout doit passer.
2. Après un ajout de photo dans `src/data/foodImages.ts` : `node scripts/fetch-image-credits.mjs`
   (le script refuse les photos sans licence libre utilisable).
3. Après une modification de la politique : `UPDATE_PRIVACY=1 npx jest legal`, puis republier PRIVACY.md.
4. Version des stores : `npx eas-cli@latest build --profile production` (sans mention « bêta ») ;
   TestFlight / test interne : profil `beta`.
5. Monter `version` dans `app.json` pour chaque nouvelle version publique (le numéro de build est automatique).
