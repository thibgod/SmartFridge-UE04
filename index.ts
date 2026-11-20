import 'expo-router/entry';

import { Platform } from 'react-native';

// Android : le widget d’écran d’accueil est dessiné par une tâche qui démarre sans ouvrir l’app.
if (Platform.OS === 'android') {
  const { registerWidgetTaskHandler } = require('react-native-android-widget') as typeof import('react-native-android-widget');
  const { widgetTaskHandler } =
    require('@/widgets/android/widgetTaskHandler') as typeof import('@/widgets/android/widgetTaskHandler');
  registerWidgetTaskHandler(widgetTaskHandler);
}
