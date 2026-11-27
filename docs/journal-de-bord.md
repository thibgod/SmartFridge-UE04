# Journal de bord de l'équipe – SmartFridge

27 novembre 2026 · Groupe 1A3-3

## Avant de commencer

SmartFridge, c'est notre idée d'appli anti-gaspillage : on note ce qu'on a au frigo, et l'appli nous prévient avant que ça périme. Nous l'avons lancée le 14 octobre, et ce journal raconte comment elle a grandi, étape par étape, jusqu'au 27 novembre.

On est le groupe 1A3-3 en Analyse informatique (UE04).

Nous décidons quoi faire, nous testons sur le simulateur et sur nos téléphones, et nous repérons ce qui ne va pas. L'IA écrit et corrige le code, et elle nous signale ce qu'elle n'a pas pu vérifier. Nous notons ici ce que nous avons demandé, ce que nous avons vu, et ce que nous avons dû corriger.

L'appli est faite avec Expo (React Native), en TypeScript. Elle tourne sur iPhone et Android, et tout reste sur le téléphone : pas de compte, pas de serveur.

## 14 et 15 octobre : l'appli prend vie

- **14 oct.** Cahier des charges écrit et première version créée. Installation du simulateur iPhone (8 Go), premiers tests et premières améliorations.
- **15 oct.** Refonte du design. Bug corrigé : les « petits pains au beurre » étaient classés comme du beurre. Ajout de la liste de courses, du ticket de caisse et de la date lue sur l'emballage. Première installation gratuite par câble sur un iPhone.

## 19 et 20 octobre : recettes et Android

- **19 oct.** 38 recettes au lieu de 14, avec portions et mode cuisine. Premiers tests sur un émulateur Android. Bilan enrichi : CO₂ évité et badges.
- **20 oct.** Feuille de route découpée en phases. Petites frictions corrigées, comme le bouton « Ajouter au frigo » affiché pour le congélateur. Piste du frigo Samsung abandonnée, trop complexe. On balaie maintenant une ligne pour « Consommé » ou « Jeté ».

## 21 et 22 octobre : production et Premium

- **21 oct.** Refonte de l'accueil, crédits des photos, politique de confidentialité et captures pour les stores. Choix de Premium : 1,99 € par mois ou 14,99 € par an, version gratuite limitée à 30 produits. Audit de l'interface selon les principes d'Apple : 7 corrections.
- **22 oct.** Nouveautés Premium : plusieurs lieux, sauvegarde automatique, couleurs au choix, export du Bilan. Deux bugs liés aux lieux corrigés.

## Du 3 au 5 novembre : finitions et Android

- **3 nov.** Bilan en PDF et icônes au choix. L'appli s'ouvre enfin sur un iPhone, après autorisation du certificat.
- **4 nov.** Constat : sans compte payant, on ne peut pas installer l'appli sans câble.
- **5 nov.** Widget Android et historique d'achat sur la fiche produit. Deux bugs Android trouvés et corrigés : le bouton « Consommé » et les liens après un changement d'icône.

## Du 10 au 17 novembre : travail en groupe

- **10 nov.** Réinstallation : le profil gratuit expire tous les 7 jours.
- **17 nov.** Projet sur GitHub en privé, avec un guide commun pour les IA. Membres du groupe invités. Appli installée sur les appareils du groupe, en version Premium de test. Diagrammes UML réalisés selon le cours.

## Du 18 au 27 novembre : chacun sa partie

- **18 nov.** Une mascotte frigo qui réagit à nos actions et propose « Annuler ». Badges du Bilan refaits en médailles qu'on peut faire tourner et retourner. Diagrammes UML ajoutés au dépôt.
- **20 nov.** Premier rendu au professeur.
- **24 nov.** Refonte du design « Liquid Glass » (onglets, fiche produit, nouvelles couleurs). Mise à jour des téléphones du groupe.
- **26 nov.** Économies du Bilan calculées par rapport à un foyer moyen. Liste de courses avec des quantités logiques selon le rythme du foyer. Mode deux colonnes sur iPad. Préparation du frigo partagé en famille, sans serveur. À l'accueil, les lots d'un même produit sont réunis sur une ligne.
- **27 nov.** Deuxième rendu au professeur.

## Ce que nous retenons

| Erreur trouvée | Leçon |
| --- | --- |
| Petits pains classés comme du beurre | Tester avec de vrais noms |
| « Consommé » sans effet sur Android | Tester sur chaque plateforme |
| PDF sans couleurs | Vérifier le résultat final, pas seulement le code |
| Réponse trop sûre sur l'installation sans câble | Vérifier les sources |
| Compte Apple gratuit plein : impossible d'ajouter un iPhone | Prévoir le compte payant avant d'agrandir l'équipe de test |

Il reste à faire :

- [ ] Choisir avec le groupe comment on se répartit les prochaines tâches
- [ ] Tester le scan, le ticket et la date sur un vrai téléphone Android mais on en a pas
- [ ] Créer les abonnements et tester un vrai achat (compte Apple à 99 € par an)
- [ ] Mettre la politique de confidentialité en ligne
- [ ] Réinstaller l'appli tous les 7 jours tant qu'on reste en compte gratuit
