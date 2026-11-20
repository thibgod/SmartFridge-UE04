/**
 * Adopte le cycle de vie iOS par scènes (UIScene), exigé par le SDK iOS 27 : une app compilée
 * avec ce SDK sans scène s’arrête dès le lancement. Expo SDK 57 fournit déjà le délégué de scène
 * (`ExpoAppSceneDelegate`) ; ce plugin le branche dans le projet généré par `expo prebuild` :
 *   1. Info.plist : déclare la configuration de scène et son délégué ;
 *   2. AppDelegate : expose la fabrique React Native au délégué de scène, qui crée la fenêtre
 *      et démarre React Native (l’AppDelegate ne le fait plus lui-même).
 * Fonctionne aussi avec Xcode 26 (scènes disponibles depuis iOS 13).
 */
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const SCENE_DELEGATE_CLASS = 'EXExpoAppSceneDelegate';

const CLASS_DECLARATION = /class AppDelegate: ExpoAppDelegate(?!,\s*ExpoReactNativeFactoryProvider)\s*\{/;
const WINDOW_STARTUP =
  /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

function withSceneInfoPlist(config) {
  return withInfoPlist(config, (mod) => {
    mod.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: SCENE_DELEGATE_CLASS,
          },
        ],
      },
    };
    return mod;
  });
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (mod) => {
    if (mod.modResults.language !== 'swift') {
      throw new Error('withSceneLifecycle : AppDelegate Swift attendu.');
    }
    let contents = mod.modResults.contents;
    if (contents.includes('ExpoReactNativeFactoryProvider')) return mod;

    if (!CLASS_DECLARATION.test(contents) || !WINDOW_STARTUP.test(contents)) {
      // Échec explicite au build plutôt qu’une app qui s’arrête au lancement.
      throw new Error(
        'withSceneLifecycle : le modèle AppDelegate.swift a changé, impossible d’adopter les scènes automatiquement.',
      );
    }
    contents = contents.replace(CLASS_DECLARATION, 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
    contents = contents.replace(
      WINDOW_STARTUP,
      '\n    // La fenêtre et React Native sont démarrés par ExpoAppSceneDelegate (cycle de vie par scènes).\n',
    );
    mod.modResults.contents = contents;
    return mod;
  });
}

module.exports = function withSceneLifecycle(config) {
  return withSceneAppDelegate(withSceneInfoPlist(config));
};
