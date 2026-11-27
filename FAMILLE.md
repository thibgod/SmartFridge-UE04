# SmartFridge Famille — frigo partagé entre plusieurs téléphones

> **Statut : préparation.** Le cœur de synchronisation est écrit et testé, mais **rien n’est branché** :
> aucun appel réseau, aucun écran, aucune migration de base. L’app reste 100 % locale.
> La suite demande une **décision d’équipe** (voir ci-dessous).

## L’idée

Les membres d’une même famille partagent un seul frigo : quand quelqu’un ajoute, consomme, jette ou
supprime un produit sur son téléphone, les autres le voient aussi, sans tout ressaisir.

## Pourquoi c’est une décision d’équipe

AGENTS.md pose une règle non négociable : **100 % local**, pas de compte, pas de serveur SmartFridge,
toute nouvelle sortie réseau validée par l’équipe. Or, pour synchroniser plusieurs téléphones, il faut :

- un **serveur** par lequel passent les produits de la famille ;
- une **identité** par téléphone (au minimum un compte anonyme) pour savoir qui appartient à quelle famille.

Conséquences à accepter avant d’aller plus loin :

- la promesse « aucune donnée ne quitte votre téléphone » ne vaut plus pour les familles (elle peut rester
  vraie pour qui n’en crée pas) ;
- la politique de confidentialité, les questionnaires App Store / Google Play et la page Premium changent ;
- Apple exige la **suppression du compte depuis l’app** dès qu’un compte existe ;
- un service tiers (hébergeur) entre dans le produit, avec un coût et une dépendance.

## Ce qui est déjà fait (PR « famille-synchro »)

| Fichier | Rôle |
| --- | --- |
| `src/features/family/family.ts` | Types `Family` / `FamilyMember`, codes d’invitation (« K7QM-4XPA », sans 0/O/1/I/L), noms |
| `src/features/family/sync.ts` | Règles de fusion des modifications, validation des données reçues |
| `src/features/family/familySync.ts` | Le frigo partagé vu d’un téléphone : file d’envoi, synchro, hors connexion, reprise |
| `src/features/family/transport.ts` | **Contrat** que le futur serveur devra respecter |
| `src/features/family/memoryServer.ts` | Serveur simulé en mémoire (tests uniquement, jamais utilisé par l’app) |
| `src/__tests__/family.test.ts` | 20 tests, dont une simulation de 3 téléphones et 200 actions aléatoires |

### Comment la fusion fonctionne

Chaque produit est découpé en trois parties indépendantes, chacune horodatée :

1. **le contenu** (nom, quantité, date…), changé par l’ajout et la modification ;
2. **l’état** (actif / consommé / jeté), changé par « Consommé », « Jeté » et « Annuler » ;
3. **la suppression**, définitive.

Pour chaque partie, la modification la plus récente l’emporte (à égalité, l’identifiant du téléphone
départage, de la même façon partout). Conséquences, toutes testées :

- « Consommé » chez l’un et « quantité corrigée » chez l’autre en même temps : **les deux sont gardés** ;
- une ancienne modification faite hors connexion, arrivée en retard, **n’écrase pas** une plus récente ;
- une **suppression est définitive**, même si quelqu’un modifie le produit ensuite sans l’avoir vue ;
- **hors connexion**, tout reste utilisable : les actions partent au retour du réseau ;
- **quel que soit l’ordre** d’arrivée des modifications, tous les téléphones finissent avec le même frigo ;
- les données reçues mal formées (ou malveillantes) sont **ignorées** ;
- la **photo n’est pas partagée** (c’est un fichier local au téléphone) ;
- en créant ou en rejoignant une famille, le frigo du téléphone est **mis en commun** ;
- en **quittant** la famille, le téléphone garde une copie, qui redevient personnelle.

Le serveur ne fusionne rien : il vérifie l’appartenance à la famille, numérote les modifications dans
l’ordre d’arrivée et les redistribue. Toute la logique est sur le téléphone, déjà testée.

## Ce qu’il reste à faire pour une mise en place à 100 %

### 1. Décisions d’équipe (avant tout code)

- [ ] Accepter de sortir du « 100 % local » pour les familles (et comment le dire aux utilisateurs).
- [ ] Gratuit ou **Premium** ? Combien de membres par famille ?
- [ ] Que partage-t-on : **tout le frigo**, ou seulement **un lieu** (les « lieux » Premium existent déjà) ?
  La liste de courses aussi ?
- [ ] Choisir l’hébergeur (proposition ci-dessous) et qui en détient le compte.

### 2. Serveur (proposition : Supabase)

Supabase (base PostgreSQL hébergée, comptes, temps réel, hébergement possible en Europe) colle bien au
contrat `SyncTransport`. Alternatives : Firebase, ou un petit serveur maison.

- [ ] Créer le projet (par le propriétaire du compte), région Europe.
- [ ] Tables : `families` (id, nom, code d’invitation), `family_members` (famille, appareil, nom, date),
      `changes` (numéro croissant, famille, appareil, contenu JSON, date).
- [ ] **Sécurité (Row Level Security)** : un appareil ne lit et n’écrit que les modifications de ses familles.
      C’est ce que vérifie le test « le serveur refuse un téléphone qui ne fait pas partie de la famille ».
- [ ] Codes d’invitation générés **côté serveur** avec un générateur cryptographique ; limiter les
      tentatives (anti-devinette), possibilité de régénérer le code.
- [ ] Écrire `supabaseTransport.ts` qui implémente `SyncTransport`, et faire passer les mêmes scénarios
      que `family.test.ts` contre lui (tests d’intégration, hors `npm test`).
- [ ] Dépendance : `npx expo install @supabase/supabase-js` (règle d’AGENTS.md), puis `npx expo-doctor`.

### 3. Identité du téléphone

- [ ] Identifiant d’appareil stable, et compte **anonyme** côté serveur (pas d’e-mail ni de mot de passe).
- [ ] Suppression du compte et des données depuis l’app (exigence Apple), et en quittant la dernière la famille.

### 4. Persistance sur le téléphone

- [ ] **Nouvelle migration v9** (ne jamais modifier v1 à v8) : état de synchro (famille, curseur, dernier
      horodatage), file d’envoi, et traces des suppressions. `familySync.snapshot()` donne déjà tout ce
      qu’il faut enregistrer, et `createFamilySync({ initial })` sait reprendre (testé).
- [ ] Sauvegardes : l’appartenance à une famille est propre au téléphone → `withoutLocalOnly`
      dans `services/backup/format.ts` ; décider si une restauration est envoyée à la famille.

### 5. Branchement dans l’app

- [ ] Dans `ProductsProvider` : chaque ajout, modification, « Consommé », « Jeté », « Annuler », suppression
      (y compris `closeMany`, `clearHistory`, `clearAll`, `restore`) est aussi noté dans la file ; les
      changements reçus sont écrits dans SQLite via `productRepository`.
- [ ] Quand synchroniser : au lancement, au retour au premier plan, après chaque action (regroupées), et
      en tirant la liste vers le bas ; éventuellement en temps réel.
- [ ] Les rappels (notifications) doivent suivre les produits ajoutés ou retirés par les autres.
- [ ] Widgets : se mettre à jour après une synchro.

### 6. Écrans (vouvoiement, typographie française)

- [ ] Réglages › **Famille** : créer, afficher et partager le code, rejoindre avec un code, liste des membres,
      quitter la famille.
- [ ] Indicateur discret « Synchronisé » / « En attente (hors connexion) ».
- [ ] Messages d’erreur (codes déjà prévus : `invalid-code`, `not-member`, `offline`, `invalid-name`).

### 7. Vie privée et stores

- [ ] `src/data/privacy.ts` : déclarer l’hébergeur et les données envoyées, puis régénérer PRIVACY.md
      (`UPDATE_PRIVACY=1 npx jest legal`) et mettre à jour `PRIVACY_UPDATED_AT`.
- [ ] STORE.md : questionnaires App Store (« Données liées à l’utilisateur ») et Google Play (« Sécurité
      des données ») ; mentions RGPD (hébergement, durée de conservation).

### 8. Limites connues à garder en tête

- **Horloges** : « le plus récent » se fonde sur l’heure de chaque téléphone. Un téléphone très en avance
  pourrait l’emporter à tort sur une modification faite à la même minute. Amélioration possible : horloge
  hybride (HLC) ou horodatage par le serveur.
- **Photos** : non partagées tant qu’aucun stockage de fichiers n’est prévu.
- **Lieux** : un produit rangé dans un lieu Premium que les autres n’ont pas pose question (voir décisions).
- **Tests sur vrais téléphones** : indispensables une fois le serveur branché (deux téléphones, réseau coupé).
