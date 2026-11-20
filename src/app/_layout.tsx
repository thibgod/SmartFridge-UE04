import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect, type PropsWithChildren } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppErrorScreen } from '@/components/AppErrorScreen';
import { AutoBackupRunner } from '@/features/backup/AutoBackupRunner';
import { ToastProvider } from '@/features/feedback/ToastProvider';
import { ImagesProvider } from '@/features/images/ImagesProvider';
import { PlacesProvider } from '@/features/places/PlacesProvider';
import { PremiumProvider, usePremium } from '@/features/premium/PremiumProvider';
import { ProductsProvider } from '@/features/products/ProductsProvider';
import { RecipeLogProvider } from '@/features/recipes/RecipeLogProvider';
import { SettingsProvider, useSettings } from '@/features/settings/SettingsProvider';
import { ShoppingProvider } from '@/features/shopping/ShoppingProvider';
import { useNotificationNavigation } from '@/hooks/useNotificationNavigation';
import { initNotifications } from '@/services/notifications';
import { DATABASE_NAME, migrateDatabase } from '@/storage/database';
import { AppThemeProvider, useTheme } from '@/theme';
import { resolveAccent } from '@/theme/accents';

/** Un plantage d’écran (ou de la base au démarrage) affiche un écran de secours, jamais une page blanche. */
export const ErrorBoundary = AppErrorScreen;

export default function RootLayout() {
  useEffect(() => {
    initNotifications().catch((error: unknown) => console.warn('[SmartFridge] Notifications indisponibles', error));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase}>
          <SettingsProvider>
            <PremiumProvider>
              <ThemedApp>
                <ImagesProvider>
                  <ProductsProvider>
                    <PlacesProvider>
                      <ShoppingProvider>
                        <RecipeLogProvider>
                          <ToastProvider>
                            <RootStack />
                            <AutoBackupRunner />
                          </ToastProvider>
                        </RecipeLogProvider>
                      </ShoppingProvider>
                    </PlacesProvider>
                  </ProductsProvider>
                </ImagesProvider>
              </ThemedApp>
            </PremiumProvider>
          </SettingsProvider>
        </SQLiteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function ThemedApp({ children }: PropsWithChildren) {
  const { themePreference, accent } = useSettings().settings;
  const { isPremium } = usePremium();
  return (
    <AppThemeProvider preference={themePreference} accent={resolveAccent(accent, isPremium)}>
      <HorizontalSafeArea>{children}</HorizontalSafeArea>
    </AppThemeProvider>
  );
}

/**
 * Marges de sécurité latérales pour toute l’app. Sur l’iPhone Duo déplié, l’appareil photo et la
 * barre d’état occupent une colonne sur le côté : rien ne doit passer dessous. Le second
 * SafeAreaProvider recalcule les marges à l’intérieur de cette zone (gauche et droite à zéro),
 * pour que les écrans et la barre d’onglets ne les appliquent pas une seconde fois.
 * Sur un iPhone classique tenu en portrait, ces marges valent zéro : rien ne change.
 */
function HorizontalSafeArea({ children }: PropsWithChildren) {
  const { left, right } = useSafeAreaInsets();
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, paddingLeft: left, paddingRight: right, backgroundColor: colors.background }}>
      <SafeAreaProvider>{children}</SafeAreaProvider>
    </View>
  );
}

function RootStack() {
  useNotificationNavigation();
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text, fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/new" options={{ title: 'Ajouter un produit', presentation: 'modal' }} />
        <Stack.Screen name="product/[id]/index" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="product/[id]/edit" options={{ title: 'Modifier le produit', presentation: 'modal' }} />
        <Stack.Screen name="recipe/[id]/index" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen
          name="recipe/[id]/cook"
          options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade' }}
        />
        <Stack.Screen name="tip/[id]" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen
          name="badge/[id]"
          options={{
            headerShown: false,
            presentation: 'formSheet',
            sheetAllowedDetents: 'fitToContents',
            sheetGrabberVisible: true,
            sheetCornerRadius: 28,
          }}
        />
        <Stack.Screen name="scan" options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade' }} />
        <Stack.Screen name="shopping-item/[id]" options={{ title: 'Modifier l’article', presentation: 'modal' }} />
        <Stack.Screen name="receipt" options={{ title: 'Ticket de caisse', presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ title: 'Réglages', presentation: 'modal' }} />
        <Stack.Screen name="places" options={{ title: 'Mes lieux', presentation: 'modal' }} />
        <Stack.Screen name="premium" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="privacy" options={{ title: 'Confidentialité' }} />
        <Stack.Screen name="credits" options={{ title: 'Crédits et licences' }} />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }}
        />
      </Stack>
    </>
  );
}
