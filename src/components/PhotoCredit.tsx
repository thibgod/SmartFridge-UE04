import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { fetchCredit, filePageUrl, formatCredit, knownCredit, photoSource } from '@/services/images/imageCredits';
import { CHROME_FONT_SCALE, fontSize, radius, spacing } from '@/theme';
import type { ImageCredit } from '@/types/content';

interface PhotoCreditProps {
  /** Adresse de la photo affichée ; rien n’est rendu pour une photo personnelle ou sans image. */
  uri: string | null | undefined;
  style?: StyleProp<ViewStyle>;
}

/**
 * Mention « © auteur · licence » posée sur une photo affichée en grand, comme l’exigent les
 * licences libres. Un toucher ouvre la page de la photo (source et texte de la licence).
 */
export function PhotoCredit({ uri, style }: PhotoCreditProps) {
  const source = photoSource(uri);
  const known = knownCredit(source);
  const [fetched, setFetched] = useState<{ uri: string; credit: ImageCredit } | null>(null);
  const needsFetch = source.kind === 'wikimedia' && !known;

  useEffect(() => {
    // `source` est recalculé à chaque rendu : on le redérive de l’adresse, seule dépendance utile.
    const target = photoSource(uri);
    if (!needsFetch || !uri || target.kind !== 'wikimedia') return;
    let active = true;
    void fetchCredit(target).then((credit) => {
      if (active && credit) setFetched({ uri, credit });
    });
    return () => {
      active = false;
    };
  }, [needsFetch, uri]);

  if (source.kind === 'none') return null;
  // Hors ligne ou en attente : on renvoie au moins vers la page de la photo.
  const credit: ImageCredit =
    known ??
    (fetched && fetched.uri === uri ? fetched.credit : null) ??
    (source.kind === 'wikimedia'
      ? { author: 'Wikimedia Commons', license: '', page: filePageUrl(source) }
      : { author: 'Open Food Facts', license: '', page: 'https://world.openfoodfacts.org' });
  const label = formatCredit(credit);

  return (
    <Pressable
      onPress={() => void Linking.openURL(credit.page).catch(() => undefined)}
      accessibilityRole="link"
      accessibilityLabel={`Crédit photo : ${label}`}
      accessibilityHint="Ouvre la page de la photo et sa licence"
      hitSlop={8}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed, style]}
    >
      <Text style={styles.text} numberOfLines={1} maxFontSizeMultiplier={CHROME_FONT_SCALE}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    position: 'absolute',
    right: spacing.md,
    maxWidth: '72%',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    // Voile sombre fixe : lisible sur n’importe quelle photo, en thème clair comme sombre.
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pressed: { backgroundColor: 'rgba(0, 0, 0, 0.7)' },
  text: { color: '#FFFFFF', fontSize: fontSize.micro, fontWeight: '600' },
});
