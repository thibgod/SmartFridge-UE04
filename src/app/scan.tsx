import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/Button';
import { MIN_TOUCH, PRESSED, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import { isPlausibleBarcode, normalizeBarcode } from '@/services/openFoodFacts/client';
import { goBack } from '@/utils/navigation';

/** Codes des produits alimentaires de grande consommation. */
const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const;

export default function ScanScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  // Écran plein modal : marges de sécurité appliquées explicitement.
  const insets = useSafeAreaInsets();
  const safePadding = { paddingTop: insets.top, paddingBottom: insets.bottom };
  const handled = useRef(false);

  const goToForm = useCallback((barcode?: string) => {
    // Revient au formulaire d’ajout s’il est ouvert, sinon l’ouvre à la place du scanner.
    router.dismissTo({
      pathname: '/product/new',
      params: barcode ? { barcode, scanId: String(Date.now()) } : {},
    });
  }, []);

  const handleScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      const code = normalizeBarcode(data);
      if (handled.current || !isPlausibleBarcode(code)) return;
      handled.current = true;
      goToForm(code);
    },
    [goToForm],
  );

  if (!permission) {
    return (
      <View style={[styles.fill, styles.center]}>
        <ActivityIndicator color={colors.onPrimary} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.fill, styles.permission, safePadding]}>
        <EmptyState
          icon="camera-outline"
          title="Accès à l’appareil photo"
          message={
            permission.canAskAgain
              ? 'SmartFridge utilise l’appareil photo uniquement pour lire le code-barres. Aucune image n’est enregistrée ni envoyée.'
              : 'L’accès à l’appareil photo est désactivé. Vous pouvez l’autoriser dans les réglages, ou saisir le code-barres à la main.'
          }
          action={
            <>
              {permission.canAskAgain ? (
                <Button label="Autoriser l’appareil photo" icon="camera" onPress={() => void requestPermission()} size="lg" />
              ) : (
                <Button
                  label="Ouvrir les réglages"
                  icon="settings-outline"
                  onPress={() => void Linking.openSettings()}
                  size="lg"
                />
              )}
              <Button label="Saisir le code à la main" variant="secondary" icon="keypad-outline" onPress={() => goToForm()} />
              <Button label="Annuler" variant="ghost" onPress={goBack} />
            </>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
        onBarcodeScanned={handleScanned}
      />

      <View style={[styles.overlay, safePadding]} pointerEvents="box-none">
        <View style={styles.topBar}>
          <RoundButton icon="close" label="Fermer le scanner" onPress={goBack} />
          <RoundButton
            icon={torch ? 'flashlight' : 'flashlight-outline'}
            label={torch ? 'Éteindre la lampe' : 'Allumer la lampe'}
            onPress={() => setTorch((value) => !value)}
          />
        </View>

        <View style={styles.frameWrapper} pointerEvents="none">
          <View style={styles.frame} />
          <Text style={styles.hint}>Placez le code-barres dans le cadre</Text>
        </View>

        <View style={styles.bottom}>
          <Button label="Saisir le code à la main" variant="secondary" icon="keypad-outline" onPress={() => goToForm()} />
        </View>
      </View>
    </View>
  );
}

function RoundButton({
  icon,
  label,
  onPress,
}: {
  icon: 'close' | 'flashlight' | 'flashlight-outline';
  label: string;
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.round, pressed && PRESSED]}
      hitSlop={8}
    >
      <Ionicons name={icon} size={24} color="#FFFFFF" />
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  fill: { flex: 1, backgroundColor: '#000000' },
  center: { alignItems: 'center', justifyContent: 'center' },
  permission: { backgroundColor: colors.background, justifyContent: 'center' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg },
  round: {
    width: MIN_TOUCH,
    height: MIN_TOUCH,
    borderRadius: MIN_TOUCH / 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameWrapper: { alignItems: 'center', gap: spacing.lg },
  frame: {
    width: '78%',
    aspectRatio: 1.6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  hint: {
    color: '#FFFFFF',
    fontSize: fontSize.bodyLarge,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  bottom: { padding: spacing.lg },
}));
