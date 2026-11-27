# SmartFridge Premium — cahier des charges

Décisions prises le 21 octobre 2026. Elles remplacent l’ancienne règle « pas d’abonnement » du projet ;
le reste tient toujours : pas de compte, pas de serveur SmartFridge, pas de mesure d’audience.

Mise à jour du 24 novembre 2026 : les médailles (badges) du Bilan passent dans la version gratuite
(règle : `isStatsFeatureLocked` dans `src/features/premium/limits.ts`, testée).

## Offre

| | |
| --- | --- |
| Nom | SmartFridge Premium |
| Formules | Abonnement mensuel **1,99 €** et annuel **14,99 €** (prix à confirmer dans les consoles) |
| Essai | **7 jours** gratuits, une fois par compte Apple / Google |
| Partage familial | **Oui** (Partage familial Apple, bibliothèque familiale Google Play) |
| Paiement | **Achats natifs** : StoreKit 2 (Apple) et Google Play Billing, vérifiés sur le téléphone, sans service tiers |
| Où l’offre apparaît | Quand on touche une limite ou une fonction Premium, et dans Réglages → « SmartFridge Premium » ; jamais imposée |

## Version gratuite (limites)

| Fonction | Gratuit | Premium |
| --- | --- | --- |
| Produits au frigo en même temps | 30 | Illimité |
| Recettes | 15 sur 38 (les autres visibles avec un cadenas) | Toutes |
| Lecture du ticket de caisse | 3 tickets par mois | Illimité |
| Widget d’écran d’accueil | — | Oui |
| Bilan | Économisé / perdu sur 30 jours, médailles (badges) | Score, impact CO₂, graphiques, périodes 6 mois / tout, export |

## Nouveautés Premium

1. **Plusieurs frigos et lieux** : maison secondaire, frigo du bureau, cave, second congélateur ; chacun son inventaire.
2. **Sauvegarde automatique** dans iCloud Drive / Google Drive (aucun serveur SmartFridge), restauration simple.
3. **Personnalisation** : thèmes de couleur et icônes d’app alternatives.
4. **Bilan avancé et export** : historique complet, graphiques par catégorie et par mois, export CSV / PDF.

## Fin d’abonnement

Rien n’est perdu : les produits au-delà de 30, les autres frigos et l’historique restent visibles et modifiables.
Seuls les **ajouts** au-delà des limites et les fonctions Premium sont bloqués jusqu’au réabonnement.

## Avancement (22 octobre 2026)

- ✅ Abonnement natif (expo-iap : StoreKit 2 / Google Play Billing) : `src/features/premium/PremiumProvider.tsx`,
  état mémorisé pour fonctionner hors ligne, revérifié au lancement et au retour dans l’app
- ✅ Écran d’offre `src/app/premium.tsx` (formules, essai, restaurer, gérer, mentions obligatoires) et rubrique Réglages
- ✅ Limites gratuites : 30 produits (formulaire et ticket), 15 recettes (cadenas, préparation et mode cuisine
  réservés), 3 tickets par mois, widget remplacé par une invitation, Bilan réduit aux montants sur 30 jours
- ✅ Une sauvegarde importée n’accorde jamais Premium et ne remet pas les quotas à zéro (testé)
- ✅ Plusieurs frigos et lieux : écran « Mes lieux », sélecteur sur l’accueil, lieu dans le formulaire et la fiche,
  recettes et doublons limités au lieu affiché ; suppression d’un lieu = produits rapatriés à la maison (migration v8)
- ✅ Sauvegarde automatique : une copie par jour dans Documents/Sauvegardes (app Fichiers sur iPhone, incluse dans
  la sauvegarde iCloud / Google du téléphone), 7 copies gardées
- ✅ Personnalisation : 5 couleurs d’accent, contraste WCAG AA vérifié par un test en clair et en sombre
- ✅ Export du Bilan : rapport PDF A4 généré sur le téléphone, ou tableau CSV (Excel, Numbers, Sheets) ; formules de tableur neutralisées
- ✅ Icônes d’app alternatives : Océan, Framboise, Prune, Terracotta (`scripts/make-alt-icons.swift`, feuille toujours verte) ; l’icône choisie reste à la fin de l’abonnement
- ⬜ Tester un achat de bout en bout : fichier de configuration StoreKit dans Xcode (simulateur) ou testeurs
  « licence » dans la Play Console, une fois les produits créés

Identifiants des produits à créer à l’identique dans les deux consoles : `smartfridge_premium_yearly` et
`smartfridge_premium_monthly` (groupe « SmartFridge Premium », essai gratuit de 7 jours sur chaque formule).

## Ce qu’il faut côté comptes (propriétaire de l’app)

- Apple Developer Program (99 €/an) et accord « Apps payantes » signé dans App Store Connect (banque, fiscalité).
- Google Play Console (25 € une fois) et profil de paiement marchand.
- Créer dans chaque console le groupe d’abonnements « SmartFridge Premium » avec les deux formules et l’essai.
- Mettre à jour la fiche : « Achats intégrés », et la politique de confidentialité (aucune donnée de paiement
  n’est vue par SmartFridge ; Apple / Google traitent le paiement).
