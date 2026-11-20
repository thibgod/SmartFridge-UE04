import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, Text, View } from 'react-native';

import { expiryColors } from '@/components/ExpiryBadge';
import { CHROME_FONT_SCALE, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { ExpiryLevel } from '@/utils/expiry';
import type { UrgencyFilter } from '@/utils/products';
import { haptics } from '@/utils/haptics';

interface UrgencySummaryProps {
  counts: Record<ExpiryLevel, number>;
  value: UrgencyFilter;
  onChange: (value: UrgencyFilter) => void;
  threshold: number;
}

/**
 * Résumé du jour en trois tuiles, qui servent aussi de filtre : un toucher sur
 * « À consommer vite » n’affiche plus que ces produits (re-toucher pour tout revoir).
 */
export function UrgencySummary({ counts, value, onChange, threshold }: UrgencySummaryProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  // Libellés concrets (« ≤ 3 jours ») plutôt qu’abstraits (« Vite ») : on comprend sans légende.
  const tiles: { level: ExpiryLevel; label: string; hint: string }[] = [
    { level: 'expired', label: 'Périmés', hint: 'à vérifier' },
    { level: 'urgent', label: `≤ ${threshold} jours`, hint: 'à consommer vite' },
    { level: 'ok', label: 'Plus tard', hint: 'rien ne presse' },
  ];

  return (
    <View style={styles.row}>
      {tiles.map((tile) => {
        const tone = expiryColors(colors, tile.level);
        const selected = value === tile.level;
        const count = counts[tile.level];
        return (
          <Pressable
            key={tile.level}
            onPress={() => {
              haptics.select();
              onChange(selected ? 'all' : tile.level);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${tile.label} : ${count} produit${count > 1 ? 's' : ''}, ${tile.hint}`}
            accessibilityHint={selected ? 'Afficher tous les produits' : 'Filtrer la liste'}
            style={({ pressed }) => [
              styles.tile,
              { backgroundColor: tone.bg, borderColor: selected ? tone.fg : 'transparent' },
              count === 0 && !selected && styles.muted,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.tileTop}>
              <Text style={[styles.count, { color: tone.fg }]} maxFontSizeMultiplier={CHROME_FONT_SCALE}>
                {count}
              </Text>
              <Ionicons name={selected ? 'funnel' : tone.icon} size={16} color={tone.fg} />
            </View>
            <Text
              style={[styles.label, { color: tone.fg }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              maxFontSizeMultiplier={CHROME_FONT_SCALE}
            >
              {tile.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles(() => ({
  row: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    minHeight: 64,
    justifyContent: 'center',
  },
  muted: { opacity: 0.55 },
  pressed: { transform: [{ scale: 0.97 }] },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { fontSize: fontSize.title + 2, fontWeight: '800', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  label: { fontSize: fontSize.caption + 1, fontWeight: '800' },
}));
