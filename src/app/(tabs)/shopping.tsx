import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LayoutAnimationConfig, LinearTransition } from 'react-native-reanimated';

import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { Screen, ScreenHeader, SectionTitle } from '@/components/ui/Screen';
import { CATEGORIES, categoryTone } from '@/constants/catalog';
import { useToast } from '@/features/feedback/ToastProvider';
import { useProducts } from '@/features/products/ProductsProvider';
import {
  formatShoppingList,
  groupShoppingItems,
  SHOPPING_NAME_MAX_LENGTH,
  suggestRestock,
} from '@/features/shopping/shoppingLogic';
import { useShopping } from '@/features/shopping/ShoppingProvider';
import { useLayout } from '@/hooks/useLayout';
import { useToday } from '@/hooks/useToday';
import { MIN_TOUCH, PRESSED, fontSize, makeStyles, radius, spacing, useTheme } from '@/theme';
import type { ShoppingItem } from '@/types/shopping';
import { parseLocalDate } from '@/utils/date';
import { haptics } from '@/utils/haptics';
import { pluralize } from '@/utils/text';

// Un article coché, ajouté ou retiré glisse à sa place et s’efface en fondu, au lieu de sauter.
const ROW_LAYOUT = LinearTransition.duration(240);
const ROW_ENTER = FadeIn.duration(220);
const ROW_EXIT = FadeOut.duration(200);

export default function ShoppingScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { gutter } = useLayout();
  const today = useToday();
  const { products } = useProducts();
  const { items, pendingCount, addItems, toggleItem, removeItem, restoreItem, clearChecked } = useShopping();
  const { showToast } = useToast();
  const [draft, setDraft] = useState('');

  const { sections, checked } = useMemo(() => groupShoppingItems(items), [items]);
  const suggestions = useMemo(() => suggestRestock(products, items, parseLocalDate(today)), [products, items, today]);

  const fail = () => showToast({ tone: 'error', message: 'La liste n’a pas pu être modifiée. Réessayez.' });

  const add = async (name: string, source: 'manual' | 'restock' = 'manual', category?: ShoppingItem['category']) => {
    try {
      const { added, duplicates } = await addItems([{ name, source, category }]);
      if (added.length > 0) haptics.light();
      else if (duplicates.length > 0) showToast({ tone: 'neutral', message: `« ${duplicates[0]} » est déjà sur la liste.` });
    } catch {
      fail();
    }
  };

  const submitDraft = () => {
    const name = draft.trim();
    if (!name) return;
    setDraft('');
    void add(name);
  };

  const toggle = (item: ShoppingItem) => {
    haptics.select();
    toggleItem(item).catch(fail);
  };

  const remove = (item: ShoppingItem) => {
    removeItem(item.id)
      .then(() =>
        showToast({
          tone: 'neutral',
          message: `« ${item.name} » retiré de la liste.`,
          actionLabel: 'Annuler',
          onAction: () => void restoreItem(item).catch(fail),
        }),
      )
      .catch(fail);
  };

  const store = (item: ShoppingItem) => {
    router.push({ pathname: '/product/new', params: { name: item.name, category: item.category, shoppingId: item.id } });
  };

  const share = () => {
    Share.share({ message: formatShoppingList(items) }).catch(() => undefined);
  };

  const isEmpty = items.length === 0;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Pas d’animation d’entrée à l’ouverture de l’onglet : seulement quand la liste change. */}
        <LayoutAnimationConfig skipEntering>
          <ScreenHeader
            title="Courses"
            subtitle={pendingCount > 0 ? `${pluralize(pendingCount, 'article')} à acheter` : 'Achetez juste ce qu’il faut.'}
            right={pendingCount > 0 ? <IconButton icon="share-outline" label="Partager la liste" onPress={share} /> : null}
          />

          <View style={styles.addBar}>
            <Ionicons name="add-circle" size={24} color={colors.primary} />
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={submitDraft}
              submitBehavior="submit"
              placeholder="Ajouter un article (ex. lait, tomates…)"
              placeholderTextColor={colors.textSubtle}
              returnKeyType="done"
              maxLength={SHOPPING_NAME_MAX_LENGTH}
              autoCapitalize="sentences"
              style={styles.input}
              accessibilityLabel="Ajouter un article à la liste de courses"
            />
            {draft.trim() ? (
              <Pressable
                onPress={submitDraft}
                accessibilityRole="button"
                accessibilityLabel="Ajouter"
                hitSlop={8}
                style={({ pressed }) => [styles.addButton, pressed && PRESSED]}
              >
                <Text style={styles.addButtonText}>Ajouter</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={() => router.push('/receipt')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.receipt, pressed && styles.pressed]}
          >
            <View style={styles.receiptIcon}>
              <Ionicons name="receipt-outline" size={20} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.receiptTitle}>De retour des courses ?</Text>
              <Text style={styles.receiptText}>Photographiez le ticket pour tout ranger d’un coup.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSubtle} />
          </Pressable>

          {suggestions.length > 0 ? (
            <>
              <SectionTitle title="À racheter ?" caption="Vous les achetez souvent et il n’y en a plus dans votre frigo." />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
                keyboardShouldPersistTaps="handled"
              >
                {suggestions.map((s) => (
                  <Chip
                    key={s.name}
                    size="sm"
                    icon="add"
                    label={s.name}
                    selected={false}
                    accessibilityLabel={`Ajouter ${s.name} à la liste`}
                    onPress={() => void add(s.name, 'restock', s.category)}
                  />
                ))}
              </ScrollView>
            </>
          ) : null}

          {isEmpty ? (
            <EmptyState
              icon="cart-outline"
              title="Liste vide"
              message="Ajoutez ce qu’il vous manque, ou les ingrédients d’une recette depuis l’onglet Recettes. Une fois acheté, rangez l’article au frigo en un geste."
            />
          ) : null}

          {!isEmpty ? <Text style={styles.help}>Touchez un article pour le cocher, appui long pour le modifier.</Text> : null}

          {sections.map((section) => (
            <Animated.View key={section.category} entering={ROW_ENTER} exiting={ROW_EXIT} layout={ROW_LAYOUT}>
              <SectionTitle title={CATEGORIES[section.category].shortLabel} />
              <Animated.View style={styles.card} layout={ROW_LAYOUT}>
                {section.data.map((item, index) => (
                  <ItemRow key={item.id} item={item} first={index === 0} onToggle={toggle} onRemove={remove} />
                ))}
              </Animated.View>
            </Animated.View>
          ))}

          {!isEmpty && sections.length === 0 ? (
            <View style={styles.done}>
              <Ionicons name="checkmark-done-circle" size={22} color={colors.success} />
              <Text style={styles.doneText}>Tout est dans le panier ! Rangez vos achats pour suivre leurs dates.</Text>
            </View>
          ) : null}

          {checked.length > 0 ? (
            <Animated.View entering={ROW_ENTER} exiting={ROW_EXIT} layout={ROW_LAYOUT}>
              <SectionTitle
                title={`Dans le panier (${checked.length})`}
                caption="Touchez « Ranger » pour l’ajouter au frigo avec sa date."
                action={<Button label="Vider" size="sm" variant="ghost" onPress={() => void clearChecked().catch(fail)} />}
              />
              <Animated.View style={styles.card} layout={ROW_LAYOUT}>
                {checked.map((item, index) => (
                  <ItemRow key={item.id} item={item} first={index === 0} onToggle={toggle} onRemove={remove} onStore={store} />
                ))}
              </Animated.View>
            </Animated.View>
          ) : null}
        </LayoutAnimationConfig>
      </ScrollView>
    </Screen>
  );
}

interface ItemRowProps {
  item: ShoppingItem;
  first: boolean;
  onToggle: (item: ShoppingItem) => void;
  onRemove: (item: ShoppingItem) => void;
  onStore?: (item: ShoppingItem) => void;
}

function ItemRow({ item, first, onToggle, onRemove, onStore }: ItemRowProps) {
  const { colors, isDark } = useTheme();
  const styles = useStyles();
  const tone = categoryTone(item.category, isDark);
  return (
    <Animated.View entering={ROW_ENTER} exiting={ROW_EXIT} layout={ROW_LAYOUT} style={[styles.row, !first && styles.rowBorder]}>
      <Pressable
        onPress={() => onToggle(item)}
        onLongPress={() => router.push({ pathname: '/shopping-item/[id]', params: { id: item.id } })}
        accessibilityHint="Appui long pour modifier"
        accessibilityActions={[{ name: 'longpress', label: 'Modifier' }]}
        onAccessibilityAction={() => router.push({ pathname: '/shopping-item/[id]', params: { id: item.id } })}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: item.checked }}
        accessibilityLabel={item.quantity ? `${item.name}, ${item.quantity}` : item.name}
        style={({ pressed }) => [styles.rowMain, pressed && PRESSED]}
      >
        <Ionicons
          name={item.checked ? 'checkmark-circle' : 'ellipse-outline'}
          size={26}
          color={item.checked ? colors.success : tone.fg}
        />
        <View style={styles.flex}>
          <Text style={[styles.name, item.checked && styles.nameChecked]} numberOfLines={2}>
            {item.name}
          </Text>
          {item.quantity || item.source !== 'manual' ? (
            <Text style={styles.meta} numberOfLines={1}>
              {[item.quantity, item.source === 'recipe' ? 'pour une recette' : item.source === 'restock' ? 'à racheter' : '']
                .filter(Boolean)
                .join(' · ')}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {onStore ? (
        <Pressable
          onPress={() => onStore(item)}
          accessibilityRole="button"
          accessibilityLabel={`Ranger ${item.name} au frigo`}
          style={({ pressed }) => [styles.store, pressed && styles.pressed]}
        >
          <MaterialCommunityIcons name="fridge-outline" size={15} color={colors.primary} />
          <Text style={styles.storeText}>Ranger</Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => onRemove(item)}
        accessibilityRole="button"
        accessibilityLabel={`Retirer ${item.name}`}
        hitSlop={10}
        style={({ pressed }) => [styles.remove, pressed && PRESSED]}
      >
        <Ionicons name="close" size={18} color={colors.textSubtle} />
      </Pressable>
    </Animated.View>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  content: { paddingBottom: spacing.xxl * 2 },
  flex: { flex: 1 },
  addBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH + 8,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, fontSize: fontSize.body, color: colors.text, paddingVertical: spacing.md },
  addButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  addButtonText: { color: colors.onPrimary, fontWeight: '700', fontSize: fontSize.caption },
  receipt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  receiptIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  receiptTitle: { fontSize: fontSize.body, fontWeight: '700', color: colors.text },
  receiptText: { fontSize: fontSize.caption, color: colors.textMuted, marginTop: 1 },
  help: { fontSize: fontSize.caption, color: colors.textSubtle, marginTop: spacing.lg, marginHorizontal: spacing.xs },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingRight: spacing.sm, minHeight: MIN_TOUCH + 8 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.surfaceMuted },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
  },
  name: { fontSize: fontSize.body, fontWeight: '600', color: colors.text },
  nameChecked: { color: colors.textMuted, textDecorationLine: 'line-through' },
  meta: { fontSize: fontSize.caption, color: colors.textMuted, marginTop: 2 },
  store: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    minHeight: 34,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  storeText: { fontSize: fontSize.caption, fontWeight: '700', color: colors.primary },
  pressed: { opacity: 0.7 },
  remove: { width: 36, height: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.successSoft,
  },
  doneText: { flex: 1, fontSize: fontSize.body, color: colors.text, lineHeight: 21 },
}));
