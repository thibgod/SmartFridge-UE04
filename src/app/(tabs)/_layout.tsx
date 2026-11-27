import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import { View, type ColorValue } from 'react-native';
import { useSafeAreaFrame } from 'react-native-safe-area-context';

import { GlassBackdrop, GlassTabBar, TabBarCollapseProvider } from '@/components/glass';
import { useProducts } from '@/features/products/ProductsProvider';
import { useSettings } from '@/features/settings/SettingsProvider';
import { useTheme } from '@/theme';
import type { IconName } from '@/types/content';
import { daysUntil } from '@/utils/date';
import { getExpiryLevel } from '@/utils/expiry';

function tabIcon(focusedIcon: IconName, unfocusedIcon: IconName) {
  return function TabBarIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    return <Ionicons name={focused ? focusedIcon : unfocusedIcon} size={size} color={color} />;
  };
}

/** Ionicons n’a pas de frigo : l’onglet principal emprunte celui de Material, plus parlant qu’un bac. */
function FridgeTabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
  return <MaterialCommunityIcons name={focused ? 'fridge' : 'fridge-outline'} size={size} color={color} />;
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { activeProducts } = useProducts();
  const threshold = useSettings().settings.urgentThresholdDays;
  // Pastille sur l’onglet : nombre de produits à consommer vite, visible depuis n’importe quel écran.
  const urgentCount = activeProducts.filter((p) => getExpiryLevel(daysUntil(p.expiresAt), threshold) === 'urgent').length;
  // Barre étroite (iPhone Duo déplié en portrait, petit écran, grand texte) : libellés courts plutôt que tronqués.
  // Largeur de la zone sûre (hors colonne de l’appareil photo), pas celle de la fenêtre.
  const narrow = useSafeAreaFrame().width / 5 < 72;

  return (
    // Un seul fond d’ambiance derrière tous les onglets (écrans transparents) : il ne clignote pas d’un onglet à l’autre.
    <TabBarCollapseProvider>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <GlassBackdrop />
        <Tabs
          // Barre flottante en verre : le contenu défile dessous (chaque écran réserve `useGlassTabBarInset()`).
          tabBar={(props) => <GlassTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            sceneStyle: { backgroundColor: 'transparent' },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Mon frigo',
              tabBarLabel: narrow ? 'Frigo' : 'Mon frigo',
              tabBarIcon: FridgeTabIcon,
              tabBarBadge: urgentCount > 0 ? urgentCount : undefined,
              tabBarAccessibilityLabel: urgentCount > 0 ? `Mon frigo, ${urgentCount} à consommer vite` : 'Mon frigo',
            }}
          />
          <Tabs.Screen name="shopping" options={{ title: 'Courses', tabBarIcon: tabIcon('cart', 'cart-outline') }} />
          <Tabs.Screen name="recipes" options={{ title: 'Recettes', tabBarIcon: tabIcon('restaurant', 'restaurant-outline') }} />
          <Tabs.Screen name="stats" options={{ title: 'Bilan', tabBarIcon: tabIcon('stats-chart', 'stats-chart-outline') }} />
          <Tabs.Screen name="tips" options={{ title: 'Conseils', tabBarIcon: tabIcon('bulb', 'bulb-outline') }} />
        </Tabs>
      </View>
    </TabBarCollapseProvider>
  );
}
