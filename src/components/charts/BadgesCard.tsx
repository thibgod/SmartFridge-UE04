import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Medal } from '@/components/badges/Medal';
import type { Achievements, Badge } from '@/features/achievements/achievements';
import { medalOf, newlyEarned, TIER_LABEL } from '@/features/achievements/medals';
import { useSettings } from '@/features/settings/SettingsProvider';
import { fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import { pluralize } from '@/utils/text';

const openBadge = (badge: Badge) => router.push({ pathname: '/badge/[id]', params: { id: badge.id } });

/** Série sans gaspillage, prochain objectif et médailles (depuis le début), façon récompenses d'Apple Fitness. */
export function BadgesCard({ achievements }: { achievements: Achievements }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const { settings, updateSettings } = useSettings();
  const { badges, streakDays, next } = achievements;
  const earnedIds = badges.filter((b) => b.achieved).map((b) => b.id);
  const seen = settings.seenBadges;

  // Première fois : ce qui était déjà gagné compte comme vu, on ne fête que les prochains.
  const earnedKey = earnedIds.join(',');
  useEffect(() => {
    if (seen === null) void updateSettings({ seenBadges: earnedKey ? earnedKey.split(',') : [] }).catch(() => undefined);
  }, [seen, earnedKey, updateSettings]);
  const fresh = new Set(newlyEarned(badges, seen));

  return (
    <View style={styles.card}>
      {streakDays !== null ? (
        <View style={styles.streak} accessible accessibilityLabel={`${pluralize(streakDays, 'jour')} sans rien jeter`}>
          <Ionicons name="flame" size={26} color={streakDays > 0 ? colors.warning : colors.textSubtle} />
          <View style={styles.flex}>
            <Text style={styles.streakValue}>{pluralize(streakDays, 'jour')} sans rien jeter</Text>
            <Text style={styles.muted}>{streakDays === 0 ? 'Une nouvelle série commence demain !' : 'Gardez la série en cours !'}</Text>
          </View>
        </View>
      ) : null}

      {next ? (
        <Pressable
          onPress={() => openBadge(next)}
          accessibilityRole="button"
          accessibilityLabel={`Prochain badge : ${next.title}, ${Math.floor(next.current)} sur ${next.target}`}
          style={({ pressed }) => [styles.next, pressed && styles.pressedRow]}
        >
          <Medal {...medalOf(next)} icon={next.icon} achieved={false} size={60} progress={next.current / next.target} />
          <View style={styles.flex}>
            <Text style={styles.muted}>Prochain badge</Text>
            <Text style={styles.badgeTitle}>{next.title}</Text>
            <Text style={styles.muted}>{next.description}</Text>
            <Text style={styles.progress}>
              {Math.floor(next.current)} / {next.target}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
        </Pressable>
      ) : null}

      <Text style={styles.muted}>
        {earnedIds.length} {earnedIds.length > 1 ? 'médailles' : 'médaille'} sur {badges.length}
      </Text>
      <View style={styles.grid}>
        {badges.map((badge) => (
          <MedalCell key={badge.id} badge={badge} isNew={fresh.has(badge.id)} />
        ))}
      </View>
    </View>
  );
}

function MedalCell({ badge, isNew }: { badge: Badge; isNew: boolean }) {
  const styles = useStyles();
  const medal = medalOf(badge);
  return (
    <Pressable
      onPress={() => openBadge(badge)}
      accessibilityRole="button"
      accessibilityLabel={`${badge.title}, ${badge.achieved ? TIER_LABEL[medal.tier] + ' obtenue' : `pas encore obtenu, ${Math.floor(badge.current)} sur ${badge.target}`}${isNew ? ', nouveau' : ''}`}
      style={styles.cell}
    >
      {({ pressed }) => (
        // Retour d'appui : la médaille s'enfonce légèrement (100 ms), comme un objet qu'on presse.
        <Animated.View
          style={[styles.cellInner, { transform: [{ scale: pressed ? 0.95 : 1 }], transitionProperty: 'transform', transitionDuration: 110 }]}
        >
          <Medal
            {...medal}
            icon={badge.icon}
            achieved={badge.achieved}
            size={78}
            progress={badge.current / badge.target}
            shine={isNew}
          />
          <Text style={[styles.cellText, !badge.achieved && styles.locked]} numberOfLines={2}>
            {badge.title}
          </Text>
          {isNew ? (
            <View style={styles.newPill}>
              <Text style={styles.newText}>Nouveau</Text>
            </View>
          ) : !badge.achieved ? (
            <Text style={styles.cellProgress}>
              {Math.floor(badge.current)} / {badge.target}
            </Text>
          ) : null}
        </Animated.View>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  card: { padding: spacing.lg, gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  flex: { flex: 1, gap: 2 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  streakValue: { fontSize: fontSize.bodyLarge, fontWeight: '800', color: colors.text },
  muted: { fontSize: fontSize.caption, color: colors.textMuted },
  next: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceMuted,
  },
  pressedRow: { opacity: 0.6 },
  badgeTitle: { fontSize: fontSize.body, fontWeight: '800', color: colors.text },
  progress: { fontSize: fontSize.micro + 1, fontWeight: '700', color: colors.textMuted, fontVariant: ['tabular-nums'], marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg },
  cell: { width: '33.33%', alignItems: 'center' },
  cellInner: { alignItems: 'center', gap: 4, paddingHorizontal: 2 },
  cellText: { fontSize: fontSize.caption, fontWeight: '700', color: colors.text, textAlign: 'center' },
  locked: { color: colors.textSubtle },
  cellProgress: { fontSize: fontSize.micro, fontWeight: '700', color: colors.textSubtle, fontVariant: ['tabular-nums'] },
  newPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.primary },
  newText: { fontSize: fontSize.micro, fontWeight: '800', color: colors.onPrimary },
}));
