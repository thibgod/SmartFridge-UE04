import * as Application from 'expo-application';
import Constants from 'expo-constants';

/**
 * Version bêta (TestFlight, test interne Google Play) : affiche l’aide « envoyer un commentaire ».
 * Fixée à la compilation par le profil EAS « beta » (eas.json) ; la version des stores en est exempte.
 */
export const IS_BETA = process.env.EXPO_PUBLIC_BETA === '1';

/** « 1.0.0 (4) » : version et numéro de build, utiles pour situer un retour de testeur. */
export function appVersionLabel(): string {
  const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '';
  const build = Application.nativeBuildVersion;
  return build ? `${version} (${build})` : version;
}
