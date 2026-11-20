import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { CategoryGrid } from '@/components/form/CategoryGrid';
import { Field, TextField } from '@/components/form/FormField';
import { Button } from '@/components/ui/Button';
import { KeyboardSafeView } from '@/components/ui/KeyboardSafeView';
import { useToast } from '@/features/feedback/ToastProvider';
import { SHOPPING_NAME_MAX_LENGTH } from '@/features/shopping/shoppingLogic';
import { useShopping } from '@/features/shopping/ShoppingProvider';
import { makeStyles, spacing } from '@/theme';
import type { ShoppingItem } from '@/types/shopping';
import { goBack } from '@/utils/navigation';

export default function ShoppingItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items } = useShopping();
  const item = items.find((i) => i.id === id);
  if (!item) {
    return (
      <EmptyState
        icon="cart-outline"
        title="Article introuvable"
        message="Il a peut-être déjà été retiré de la liste."
        action={<Button label="Retour" onPress={goBack} />}
      />
    );
  }
  return <ShoppingItemForm item={item} />;
}

/** Corriger un article : nom, précision de quantité et rayon. */
function ShoppingItemForm({ item }: { item: ShoppingItem }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { updateItem, removeItem } = useShopping();
  const { showToast } = useToast();
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(item.quantity);
  const [category, setCategory] = useState(item.category);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const trimmed = name.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      setError('Indiquez le nom de l’article.');
      return;
    }
    try {
      await updateItem(item.id, { name: trimmed, quantity: quantity.trim().slice(0, 20), category });
      goBack();
    } catch {
      setError('Enregistrement impossible. Réessayez.');
    }
  };

  const remove = () => {
    goBack();
    removeItem(item.id).catch(() => showToast({ tone: 'error', message: 'La suppression a échoué.' }));
  };

  return (
    <KeyboardSafeView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextField
          label="Article"
          required
          value={name}
          onChangeText={(text) => {
            setName(text);
            setError(null);
          }}
          error={error ?? undefined}
          maxLength={SHOPPING_NAME_MAX_LENGTH}
          autoCapitalize="sentences"
          returnKeyType="done"
          onSubmitEditing={() => void save()}
        />
        <TextField
          label="Quantité"
          value={quantity}
          onChangeText={setQuantity}
          placeholder="2, 500 g, 1 paquet…"
          maxLength={20}
          returnKeyType="done"
          onSubmitEditing={() => void save()}
        />
        <Field label="Rayon">
          <CategoryGrid value={category} onChange={setCategory} />
        </Field>
        <Button label="Retirer de la liste" icon="trash-outline" variant="ghost" onPress={remove} />
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button label="Enregistrer" icon="checkmark" size="lg" onPress={() => void save()} />
      </View>
    </KeyboardSafeView>
  );
}

const useStyles = makeStyles(({ colors }) => ({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, width: '100%', maxWidth: 680, alignSelf: 'center' },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
}));
