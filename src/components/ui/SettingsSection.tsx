import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, useContext, type PropsWithChildren, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { fontSize, makeStyles, MIN_TOUCH, radius, SETTINGS_TINTS, spacing, useTheme, type SettingsTint } from '@/theme';
import type { IconName } from '@/types/content';

interface SettingsSectionProps {
  title: string;
  icon: IconName;
  footer?: string;
  /** Couleur de la rubrique (Réglages) : tuiles d’icônes pleines, comme dans les Réglages d’iOS. */
  tint?: SettingsTint;
}

/** Couleur de la rubrique en cours, transmise aux lignes d’action qu’elle contient. */
const SectionTintContext = createContext<string | null>(null);

/** Carte de réglages : titre, contenu, note explicative facultative. */
export function SettingsSection({ title, icon, footer, tint, children }: PropsWithChildren<SettingsSectionProps>) {
  const { colors } = useTheme();
  const styles = useStyles();
  const tintColor = tint ? SETTINGS_TINTS[tint] : null;
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        {tintColor ? (
          <View style={[styles.headerTile, { backgroundColor: tintColor }]}>
            <Ionicons name={icon} size={12} color={colors.onTint} />
          </View>
        ) : (
          <Ionicons name={icon} size={16} color={colors.primary} />
        )}
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
      </View>
      <SectionTintContext.Provider value={tintColor}>
        <View style={styles.card}>{children}</View>
      </SectionTintContext.Provider>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

export function SettingsLabel({ label, description, children }: PropsWithChildren<{ label: string; description?: string }>) {
  const styles = useStyles();
  return (
    <View style={styles.block}>
      <Text style={styles.label}>{label}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {children ? <View style={styles.blockContent}>{children}</View> : null}
    </View>
  );
}

interface SettingsSwitchProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

export function SettingsSwitch({ label, description, value, onValueChange }: SettingsSwitchProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={[styles.block, styles.switchRow]}>
      <View style={styles.flex}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        accessibilityLabel={label}
      />
    </View>
  );
}

interface SettingsActionProps {
  label: string;
  icon: IconName;
  onPress: () => void;
  tone?: 'default' | 'danger';
  description?: string;
  trailing?: ReactNode;
}

export function SettingsAction({ label, icon, onPress, tone = 'default', description, trailing }: SettingsActionProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const sectionTint = useContext(SectionTintContext);
  const color = tone === 'danger' ? colors.danger : colors.primary;
  // Dans une rubrique colorée : tuile pleine et pictogramme blanc ; sinon, tuile douce de l’accent.
  const tileColor = tone === 'danger' ? SETTINGS_TINTS.red : sectionTint;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description}
      style={({ pressed }) => [styles.block, styles.action, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.actionIcon,
          { backgroundColor: tileColor ?? (tone === 'danger' ? colors.dangerSoft : colors.primarySoft) },
        ]}
      >
        <Ionicons name={icon} size={19} color={tileColor ? colors.onTint : color} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.actionLabel, tone === 'danger' && { color: colors.danger }]}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {trailing ?? <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />}
    </Pressable>
  );
}

export function SettingsDivider() {
  const styles = useStyles();
  return <View style={styles.divider} />;
}

const useStyles = makeStyles(({ colors, shadow }) => ({
  section: { marginBottom: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, marginBottom: spacing.sm, marginLeft: spacing.xs },
  headerTile: { width: 20, height: 20, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSize.caption, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.6 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow,
  },
  footer: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginHorizontal: spacing.xs,
    lineHeight: 18,
  },
  block: { padding: spacing.lg, minHeight: MIN_TOUCH },
  blockContent: { marginTop: spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  label: { fontSize: fontSize.bodyLarge - 1, fontWeight: '600', color: colors.text },
  description: { fontSize: fontSize.caption + 1, color: colors.textMuted, marginTop: 2, lineHeight: 19 },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actionIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: fontSize.bodyLarge - 1, fontWeight: '600', color: colors.text },
  pressed: { backgroundColor: colors.surfaceMuted },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: spacing.lg },
}));
