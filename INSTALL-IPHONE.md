# Installer SmartFridge gratuitement sur ton iPhone (par câble)

Méthode gratuite : ton identifiant Apple habituel suffit, sans compte développeur payant.

**Limites d’Apple pour les comptes gratuits**
- L’app fonctionne **7 jours**, puis il faut la réinstaller (rebrancher et relancer la commande, tes données restent).
- Uniquement sur **tes propres appareils** branchés au Mac. Pour tes amis, il faut le compte payant et TestFlight
  (voir [TESTFLIGHT.md](TESTFLIGHT.md)), ou brancher leur iPhone sur ton Mac (7 jours aussi).
- 3 apps maximum installées ainsi en même temps.

## Une seule fois

1. **Xcode → Réglages → Comptes → « + » → Apple ID** : connecte ton identifiant Apple.
   Il apparaît avec une équipe « (Personal Team) ».
2. **iPhone** : branche-le au Mac par câble, déverrouille-le, réponds **« Se fier »** à cet ordinateur.
3. **iPhone → Réglages → Confidentialité et sécurité → Mode développeur** : active-le
   (l’iPhone redémarre, confirme ensuite).
4. **Première signature dans Xcode** :

   ```bash
   open ios/SmartFridge.xcworkspace
   ```

   Dans Xcode : clique sur **SmartFridge** (en haut à gauche) → onglet **Signing & Capabilities** →
   **Team** : choisis ta « Personal Team ». Si Xcode signale que l’identifiant `app.smartfridge.mobile`
   est déjà pris, remplace-le par exemple par `com.tonprenom.smartfridge` (et la même valeur dans `app.json`).

5. **Widget** : dans Xcode, onglet **Signing & Capabilities**, choisis aussi ta « Personal Team » pour la
   cible **ExpoWidgetsTarget** (en plus de SmartFridge). Xcode enregistre alors l’App Group du widget.

## Installer (et réinstaller tous les 7 jours)

iPhone branché et déverrouillé :

```bash
npx expo run:ios --device --configuration Release
```

Choisis ton iPhone dans la liste. La première compilation prend une dizaine de minutes, les suivantes 1 à 2 min.

Au premier lancement, si l’iPhone affiche « Développeur non approuvé » :
**Réglages → Général → VPN et gestion de l’appareil → ton Apple ID → Faire confiance**.

Si l’installation échoue avec `Unicode Normalization not appropriate for ASCII-8BIT` (CocoaPods),
relance la commande précédée de `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`.

La version `Release` est autonome : elle n’a pas besoin du Mac ni du réseau local pour fonctionner.
