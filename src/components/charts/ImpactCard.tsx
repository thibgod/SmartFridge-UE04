import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { IconName } from '@/types/content';
import { formatKg, type ImpactSummary } from '@/utils/impact';

/** Impact concret des produits sauvés de justesse : nourriture, CO₂ et équivalent voiture (estimations). */
export function ImpactCard({ impact }: { impact: ImpactSummary }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const km = Math.round(impact.carKm);
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="earth" size={18} color={colors.success} />
        <Text style={styles.title}>Votre impact</Text>
      </View>
      <View style={styles.row}>
        <Item icon="basket-outline" value={formatKg(impact.savedKg)} label="de nourriture sauvée de justesse" />
        <Item icon="cloud-outline" value={formatKg(impact.co2Kg)} label="de CO₂ évités" />
        <Item icon="car-outline" value={`${km} km`} label="en voiture, en équivalent" />
      </View>
      <Text style={styles.note}>
        Produits mangés près de leur date (ou après). Estimations d’après les quantités saisies et des moyennes par catégorie
        (ADEME).
      </Text>
    </View>
  );
}

function Item({ icon, value, label }: { icon: IconName; value: string; label: string }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.item} accessible accessibilityLabel={`${value} ${label}`}>
      <Ionicons name={icon} size={18} color={colors.success} />
      <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  card: { padding: spacing.lg, gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.successSoft },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  title: { fontSize: fontSize.body, fontWeight: '800', color: colors.text },
  row: { flexDirection: 'row', gap: spacing.sm },
  item: { flex: 1, gap: 2 },
  value: { fontSize: fontSize.title, fontWeight: '800', color: colors.text, marginTop: 4 },
  label: { fontSize: fontSize.caption, color: colors.textMuted, lineHeight: 17 },
  note: { fontSize: fontSize.micro + 1, color: colors.textMuted },
}));
