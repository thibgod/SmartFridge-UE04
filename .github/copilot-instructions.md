# Instructions pour GitHub Copilot

Les instructions complètes du projet, communes à toutes les IA de l’équipe, sont dans le fichier
`AGENTS.md` à la racine du dépôt : lis-le avant toute modification.

L’essentiel :
- App Expo SDK 57 / React Native / TypeScript strict. Interface en français (vouvoiement), code en anglais.
- Ne pas faire confiance à ses souvenirs d’Expo : lire https://docs.expo.dev/versions/v57.0.0/
- Écrans dans `src/app/` (Expo Router) uniquement ; logique pure dans `src/utils/` et `src/features/`.
- Styles avec `makeStyles` et les jetons de `src/theme`, jamais de couleur en dur.
- Ne jamais modifier une migration existante de `src/storage/database.ts` ; en ajouter une.
- Ajouter une dépendance avec `npx expo install`, jamais `npm install <paquet>`.
- Ne pas modifier `ios/` ni `android/` (générés) : passer par `app.json` et `plugins/`.
- 100 % local : aucun serveur, aucune mesure d’audience, aucune nouvelle sortie réseau non validée.
- Travailler sur une branche, puis `npm run typecheck && npm run lint && npm test` avant toute pull request.
