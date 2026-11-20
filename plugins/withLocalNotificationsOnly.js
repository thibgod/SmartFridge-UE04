/**
 * SmartFridge n’utilise que des notifications LOCALES (rappels programmés sur le téléphone).
 * expo-notifications ajoute pourtant le droit « Push Notifications » (aps-environment),
 * qui n’est pas disponible avec un compte Apple gratuit et empêcherait d’installer l’app
 * sur son propre iPhone par câble. Les notifications locales fonctionnent sans ce droit.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withLocalNotificationsOnly(config) {
  return withEntitlementsPlist(config, (mod) => {
    delete mod.modResults['aps-environment'];
    return mod;
  });
};
