import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PhotoCredit } from '@/components/PhotoCredit';
import { CATEGORIES, categoryTone } from '@/constants/catalog';
import { useFoodImage } from '@/features/images/ImagesProvider';
import { IMAGE_HEADERS } from '@/services/images/foodImages';
import { resolvePhotoUri } from '@/services/photos';
import { useTheme } from '@/theme';
import type { ProductCategory } from '@/types/product';
import { isLocalPhoto } from '@/utils/photo';

interface FoodImageProps {
  /** Nom du produit (sert à trouver une illustration). */
  name: string;
  category: ProductCategory;
  /** Photo explicite (personnelle ou Open Food Facts) prioritaire. */
  uri?: string;
  /** Taille carrée ; sinon remplir `style`. */
  size?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  /** Photo pleine (cover) plutôt que produit détouré (contain). */
  fit?: 'cover' | 'contain';
  /** Affiche le crédit de la photo (affichage en grand), à cette distance du bas. */
  creditBottom?: number;
}

/**
 * Visuel d’un aliment : photo, illustration automatique ou, à défaut, icône de catégorie
 * sur fond teinté. Le repli s’affiche aussi pendant le chargement et en cas d’erreur réseau.
 */
export function FoodImage({ name, category, uri, size, radius = 12, style, fit = 'cover', creditBottom }: FoodImageProps) {
  const { isDark } = useTheme();
  const ownPhoto = isLocalPhoto(uri);
  const resolved = useFoodImage(name, resolvePhotoUri(uri), size && size <= 80 ? 200 : 480);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const tone = categoryTone(category, isDark);
  const frame = size ? { width: size, height: size } : null;
  const showImage = resolved && resolved !== failedUri;
  // Les photos Open Food Facts sont des produits détourés : on les affiche en entier sur fond clair.
  const packshot = !!uri && !ownPhoto;
  const contentFit = packshot ? 'contain' : fit;

  return (
    <View
      style={[styles.frame, frame, { borderRadius: radius, backgroundColor: showImage && packshot ? '#FFFFFF' : tone.bg }, style]}
      accessibilityIgnoresInvertColors
    >
      <Ionicons name={CATEGORIES[category].icon} size={(size ?? 96) * 0.44} color={tone.fg} />
      {showImage ? (
        <Image
          source={{ uri: resolved, headers: IMAGE_HEADERS }}
          style={StyleSheet.absoluteFill}
          contentFit={contentFit}
          cachePolicy="disk"
          transition={200}
          recyclingKey={resolved}
          onError={() => setFailedUri(resolved)}
          accessible={false}
        />
      ) : null}
      {showImage && creditBottom !== undefined ? <PhotoCredit uri={resolved} style={{ bottom: creditBottom }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
