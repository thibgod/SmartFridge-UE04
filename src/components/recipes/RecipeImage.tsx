import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PhotoCredit } from '@/components/PhotoCredit';
import { RECIPE_IMAGES } from '@/data/foodImages';
import { useCatalogImage } from '@/features/images/ImagesProvider';
import { IMAGE_HEADERS } from '@/services/images/foodImages';
import { useTheme } from '@/theme';
import type { Recipe } from '@/types/content';

/** Photo de recette, avec repli élégant (icône sur fond teinté) hors ligne ou si désactivé. */
export function RecipeImage({
  recipe,
  style,
  width = 640,
  creditBottom,
}: {
  recipe: Recipe;
  style?: StyleProp<ViewStyle>;
  width?: number;
  /** Affiche le crédit de la photo (affichage en grand), à cette distance du bas. */
  creditBottom?: number;
}) {
  const { colors } = useTheme();
  const uri = useCatalogImage(RECIPE_IMAGES[recipe.id], width);
  const [failed, setFailed] = useState(false);

  return (
    <View style={[styles.frame, { backgroundColor: colors.primarySoft }, style]} accessibilityIgnoresInvertColors>
      <Ionicons name={recipe.icon} size={40} color={colors.primary} />
      {uri && !failed ? (
        <Image
          source={{ uri, headers: IMAGE_HEADERS }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="disk"
          transition={200}
          onError={() => setFailed(true)}
          accessible={false}
        />
      ) : null}
      {uri && !failed && creditBottom !== undefined ? <PhotoCredit uri={uri} style={{ bottom: creditBottom }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
