import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo } from 'react';
import { FlatList, Linking, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listPhotoCredits, type PhotoCreditEntry } from '@/features/legal/photoCredits';
import { formatCredit } from '@/services/images/imageCredits';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { IconName } from '@/types/content';

interface Source {
  icon: IconName;
  title: string;
  text: string;
  url: string;
}

const SOURCES: readonly Source[] = [
  {
    icon: 'barcode-outline',
    title: 'Open Food Facts',
    text: 'Fiches produits : données sous licence ODbL, photos sous CC BY-SA, © les contributeurs d’Open Food Facts.',
    url: 'https://world.openfoodfacts.org/terms-of-use',
  },
  {
    icon: 'images-outline',
    title: 'Wikimedia Commons et Wikipédia',
    text: 'Illustrations des aliments, recettes et conseils, sous licences libres. Le crédit de chaque photo est indiqué ci-dessous et sur la photo en grand.',
    url: 'https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/fr',
  },
  {
    icon: 'leaf-outline',
    title: 'ADEME — Agribalyse',
    text: 'Ordres de grandeur des émissions évitées (Bilan), arrondis à partir des moyennes Agribalyse.',
    url: 'https://agribalyse.ademe.fr',
  },
  {
    icon: 'code-slash-outline',
    title: 'Logiciels libres',
    text: 'SmartFridge est construit avec Expo et React Native (licence MIT), les icônes Ionicons (MIT) et Material Design Icons (Apache 2.0).',
    url: 'https://expo.dev',
  },
];

const open = (url: string) => void Linking.openURL(url).catch(() => undefined);

/** Sources des données et crédit de chaque photo, comme l’exigent leurs licences. */
export default function CreditsScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const photos = useMemo(() => listPhotoCredits(), []);

  const header = (
    <View style={styles.header}>
      {SOURCES.map((source) => (
        <Pressable
          key={source.title}
          onPress={() => open(source.url)}
          accessibilityRole="link"
          accessibilityHint="Ouvre le site de la source"
          style={({ pressed }) => [styles.source, pressed && styles.pressed]}
        >
          <View style={styles.sourceIcon}>
            <Ionicons name={source.icon} size={18} color={colors.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.sourceTitle}>{source.title}</Text>
            <Text style={styles.sourceText}>{source.text}</Text>
          </View>
          <Ionicons name="open-outline" size={16} color={colors.textSubtle} />
        </Pressable>
      ))}
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Photos ({photos.length})
      </Text>
      <Text style={styles.sectionCaption}>Touchez une photo pour voir sa page et le texte de sa licence.</Text>
    </View>
  );

  const renderItem = ({ item }: { item: PhotoCreditEntry }) => (
    <Pressable
      onPress={() => item.credit && open(item.credit.page)}
      disabled={!item.credit}
      accessibilityRole="link"
      style={({ pressed }) => [styles.photo, pressed && styles.pressed]}
    >
      <Text style={styles.photoUsage} numberOfLines={2}>
        {item.usages.join(' · ')}
      </Text>
      <Text style={styles.photoCredit} numberOfLines={2}>
        {item.credit ? formatCredit(item.credit) : item.file}
      </Text>
    </Pressable>
  );

  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      data={photos}
      keyExtractor={(item) => item.file}
      renderItem={renderItem}
      ListHeaderComponent={header}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      initialNumToRender={16}
    />
  );
}

const useStyles = makeStyles(({ colors }) => ({
  content: { padding: spacing.lg, width: '100%', maxWidth: 760, alignSelf: 'center' },
  flex: { flex: 1 },
  header: { gap: spacing.sm, marginBottom: spacing.sm },
  source: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.7 },
  sourceIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  sourceTitle: { fontSize: fontSize.body, fontWeight: '800', color: colors.text },
  sourceText: { fontSize: fontSize.caption, lineHeight: 18, color: colors.textMuted, marginTop: 2 },
  sectionTitle: { fontSize: fontSize.title - 2, fontWeight: '800', color: colors.text, marginTop: spacing.lg },
  sectionCaption: { fontSize: fontSize.caption, color: colors.textMuted },
  photo: { paddingVertical: spacing.sm + 2, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 2 },
  photoUsage: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  photoCredit: { fontSize: fontSize.caption, color: colors.textMuted },
}));
