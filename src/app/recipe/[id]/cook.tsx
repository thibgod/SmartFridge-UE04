import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { RECIPES } from '@/data/recipes';
import { isRecipeLocked } from '@/features/premium/limits';
import { usePremium } from '@/features/premium/PremiumProvider';
import { formatIngredient, stepTimerMinutes } from '@/features/recipes/recipeIngredients';
import { useCookRecipe } from '@/features/recipes/useCookRecipe';
import { HEADING_FONT_SCALE, PRESSED, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { Recipe } from '@/types/content';
import { haptics } from '@/utils/haptics';
import { pluralize } from '@/utils/text';
import { goBack } from '@/utils/navigation';

export default function CookScreen() {
  const { id, servings } = useLocalSearchParams<{ id: string; servings?: string }>();
  const recipe = RECIPES.find((r) => r.id === id);
  const { isPremium, showPaywall } = usePremium();
  if (recipe && isRecipeLocked(recipe.id, isPremium)) {
    return (
      <EmptyState
        icon="lock-closed-outline"
        title="Recette Premium"
        message="Le mode cuisine de cette recette est inclus dans SmartFridge Premium."
        action={
          <>
            <Button label="Découvrir Premium" icon="sparkles-outline" size="lg" onPress={() => showPaywall('recipes')} />
            <Button label="Retour" variant="ghost" onPress={goBack} />
          </>
        }
      />
    );
  }
  if (!recipe) {
    return (
      <EmptyState
        icon="help-circle-outline"
        title="Recette introuvable"
        message="Cette recette n’existe plus."
        action={<Button label="Retour" onPress={goBack} />}
      />
    );
  }
  const people = Number(servings);
  return <CookMode recipe={recipe} servings={Number.isFinite(people) && people > 0 ? people : recipe.servings} />;
}

const formatClock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** Mode cuisine : une étape à la fois, en grand, l’écran reste allumé. */
function CookMode({ recipe, servings }: { recipe: Recipe; servings: number }) {
  useKeepAwake();
  const { colors } = useTheme();
  const styles = useStyles();
  // Même approche que le scanner et la présentation : SafeAreaView ne reçoit pas les marges en plein écran modal.
  const insets = useSafeAreaInsets();
  const { usable, selected, toggle, cooked } = useCookRecipe(recipe);
  // Étape -1 : ingrédients à préparer ; au-delà de la dernière : écran de fin.
  const [index, setIndex] = useState(-1);
  const [timer, setTimer] = useState<{ step: number; endsAt: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [saved, setSaved] = useState<number | null>(null);
  const [error, setError] = useState(false);

  const total = recipe.steps.length;
  const finished = index >= total;
  const step = index >= 0 && !finished ? recipe.steps[index] : undefined;
  const stepMinutes = step ? stepTimerMinutes(step) : null;
  const remaining = timer ? Math.max(0, Math.round((timer.endsAt - now) / 1000)) : 0;

  useEffect(() => {
    if (!timer) return;
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    if (timer && remaining === 0) haptics.warning();
  }, [timer, remaining]);

  const go = (next: number) => {
    haptics.select();
    setIndex(Math.min(total, Math.max(-1, next)));
  };

  const startTimer = (minutes: number) => {
    haptics.light();
    setNow(Date.now());
    setTimer({ step: index, endsAt: Date.now() + minutes * 60_000 });
  };

  const finish = async () => {
    setError(false);
    try {
      setSaved(await cooked());
    } catch {
      setError(true);
    }
  };

  const timerDone = timer !== null && remaining === 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>Mode cuisine · {pluralize(servings, 'personne')}</Text>
          <Text style={styles.recipeTitle} numberOfLines={1}>
            {recipe.title}
          </Text>
        </View>
        <IconButton icon="close" label="Quitter le mode cuisine" onPress={goBack} />
      </View>

      <View style={styles.progress} accessibilityLabel={`Étape ${Math.max(0, index) + 1} sur ${total}`}>
        {recipe.steps.map((s, i) => (
          <View key={s} style={[styles.progressBar, i <= index && styles.progressDone]} />
        ))}
      </View>

      {timer ? (
        <Pressable
          onPress={() => setTimer(null)}
          accessibilityRole="button"
          accessibilityLabel={
            timerDone ? 'Minuteur terminé, toucher pour fermer' : `Minuteur : ${formatClock(remaining)}, toucher pour arrêter`
          }
          style={({ pressed }) => [styles.timerBanner, timerDone && styles.timerBannerDone, pressed && PRESSED]}
        >
          <Ionicons
            name={timerDone ? 'alarm' : 'timer-outline'}
            size={22}
            color={timerDone ? colors.onPrimary : colors.primary}
          />
          <Text style={[styles.timerText, timerDone && styles.timerTextDone]}>
            {timerDone ? `C’est prêt ! (étape ${timer.step + 1})` : `${formatClock(remaining)} · étape ${timer.step + 1}`}
          </Text>
          <Ionicons name="close" size={18} color={timerDone ? colors.onPrimary : colors.textMuted} />
        </Pressable>
      ) : null}

      <ScrollView contentContainerStyle={styles.body}>
        {index === -1 ? (
          <>
            <Text style={styles.stepLabel}>Avant de commencer</Text>
            <Text style={styles.prepTitle} maxFontSizeMultiplier={HEADING_FONT_SCALE}>
              Sortez les ingrédients
            </Text>
            {recipe.ingredients.map((ingredient, i) => {
              const { amount, label } = formatIngredient(ingredient, servings, recipe.servings);
              return (
                <View key={`${ingredient.name}-${i}`} style={styles.prepRow}>
                  <Ionicons name="ellipse" size={8} color={colors.primary} />
                  <Text style={[styles.prepText, ingredient.optional && styles.muted]}>
                    {amount ? <Text style={styles.bold}>{amount} </Text> : null}
                    {label}
                    {ingredient.optional ? ' (facultatif)' : ''}
                  </Text>
                </View>
              );
            })}
          </>
        ) : finished ? (
          <View style={styles.end}>
            <Ionicons name={saved === null ? 'restaurant' : 'checkmark-circle'} size={64} color={colors.primary} />
            <Text style={styles.prepTitle} maxFontSizeMultiplier={HEADING_FONT_SCALE}>
              {saved === null ? 'Bon appétit !' : 'C’est noté !'}
            </Text>
            {saved === null ? (
              <>
                {usable.length > 0 ? (
                  <>
                    <Text style={styles.endText}>Quels produits du frigo avez-vous utilisés ?</Text>
                    {usable.map((product) => {
                      const checked = selected.has(product.id);
                      return (
                        <Pressable
                          key={product.id}
                          onPress={() => toggle(product.id)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked }}
                          style={({ pressed }) => [styles.useRow, pressed && PRESSED]}
                        >
                          <Ionicons
                            name={checked ? 'checkbox' : 'square-outline'}
                            size={24}
                            color={checked ? colors.primary : colors.textSubtle}
                          />
                          <Text style={styles.useText}>{product.name}</Text>
                        </Pressable>
                      );
                    })}
                  </>
                ) : (
                  <Text style={styles.endText}>Enregistrez la recette pour la retrouver dans votre historique.</Text>
                )}
                {error ? <Text style={styles.error}>L’enregistrement a échoué. Réessayez.</Text> : null}
              </>
            ) : (
              <Text style={styles.endText}>
                {saved > 0
                  ? `${pluralize(saved, 'produit sauvé', 'produits sauvés')} du gaspillage. Bravo !`
                  : 'Recette ajoutée à votre historique.'}
              </Text>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.stepLabel}>
              Étape {index + 1} sur {total}
            </Text>
            <Text style={styles.stepText} accessibilityLiveRegion="polite" maxFontSizeMultiplier={HEADING_FONT_SCALE}>
              {step}
            </Text>
            {stepMinutes ? (
              <Button
                label={`Minuteur ${stepMinutes} min`}
                icon="timer-outline"
                variant="tonal"
                size="lg"
                style={styles.timerButton}
                onPress={() => startTimer(stepMinutes)}
              />
            ) : null}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {finished && saved !== null ? (
          <Button
            label="Terminer"
            icon="checkmark"
            size="lg"
            style={styles.flex}
            onPress={() => router.dismissTo('/(tabs)/recipes')}
          />
        ) : finished ? (
          <>
            <Button label="Retour" icon="chevron-back" variant="secondary" size="lg" onPress={() => go(index - 1)} />
            <Button label="J’ai cuisiné" icon="checkmark-done" size="lg" style={styles.flex} onPress={() => void finish()} />
          </>
        ) : (
          <>
            <Button
              label="Précédent"
              icon="chevron-back"
              variant="secondary"
              size="lg"
              disabled={index === -1}
              onPress={() => go(index - 1)}
            />
            <Button
              label={index === -1 ? 'C’est parti' : index === total - 1 ? 'Terminer' : 'Suivant'}
              icon="chevron-forward"
              size="lg"
              style={styles.flex}
              onPress={() => go(index + 1)}
            />
          </>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  eyebrow: {
    fontSize: fontSize.caption,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  recipeTitle: { fontSize: fontSize.title, fontWeight: '800', color: colors.text },
  progress: { flexDirection: 'row', gap: 4, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  progressBar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.surfaceMuted },
  progressDone: { backgroundColor: colors.primary },
  timerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  timerBannerDone: { backgroundColor: colors.primary },
  timerText: { flex: 1, fontSize: fontSize.bodyLarge, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  timerTextDone: { color: colors.onPrimary },
  body: { padding: spacing.xl, paddingBottom: spacing.xxl, width: '100%', maxWidth: 760, alignSelf: 'center', flexGrow: 1 },
  stepLabel: {
    fontSize: fontSize.caption,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  stepText: { fontSize: 28, lineHeight: 38, fontWeight: '600', color: colors.text, marginTop: spacing.md },
  timerButton: { marginTop: spacing.xl, alignSelf: 'flex-start' },
  prepTitle: {
    fontSize: fontSize.heading,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  prepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  prepText: { flex: 1, fontSize: fontSize.bodyLarge, color: colors.text, lineHeight: 24 },
  bold: { fontWeight: '800' },
  muted: { color: colors.textMuted },
  end: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xl },
  endText: {
    fontSize: fontSize.bodyLarge,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  useRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, alignSelf: 'stretch', paddingVertical: spacing.sm },
  useText: { fontSize: fontSize.bodyLarge, color: colors.text, fontWeight: '600' },
  error: { fontSize: fontSize.body, color: colors.danger },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
}));
