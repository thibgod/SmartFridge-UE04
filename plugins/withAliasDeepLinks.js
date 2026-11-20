const { withAndroidManifest } = require('expo/config-plugins');

/**
 * Android : choisir une icône alternative désactive `.MainActivity` et active un alias qui ne
 * déclare que le lancement. Sans ce plugin, les liens smartfridge:// (widget, liens externes)
 * ne mènent plus nulle part dès qu’une autre icône est choisie.
 *
 * À placer AVANT `expo-alternate-app-icons` dans app.json : le dernier plugin déclaré modifie
 * le manifeste en premier, et les alias doivent déjà exister quand celui-ci s’exécute.
 */
module.exports = function withAliasDeepLinks(config) {
  const scheme = config.scheme;
  return withAndroidManifest(config, (next) => {
    const [application] = next.modResults.manifest.application ?? [];
    for (const alias of application?.['activity-alias'] ?? []) {
      alias['intent-filter'] = [
        ...(alias['intent-filter'] ?? []),
        {
          action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
          category: [
            { $: { 'android:name': 'android.intent.category.DEFAULT' } },
            { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
          ],
          data: [{ $: { 'android:scheme': scheme } }],
        },
      ];
    }
    return next;
  });
};
