import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { ProductForm } from '@/components/ProductForm';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/features/feedback/ToastProvider';
import { useProductActions } from '@/features/products/useProductActions';
import { useProducts } from '@/features/products/ProductsProvider';
import { productToFormValues, useProductForm } from '@/features/products/useProductForm';
import type { Product, ProductInput } from '@/types/product';
import { goBack } from '@/utils/navigation';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { products, isLoading } = useProducts();
  const product = products.find((p) => p.id === id && p.status === 'active');

  if (!product) {
    if (isLoading) return null;
    return (
      <EmptyState
        icon="help-circle-outline"
        title="Produit introuvable"
        message="Ce produit a peut-être déjà été consommé, jeté ou supprimé."
        action={<Button label="Retour à mon frigo" onPress={goBack} />}
      />
    );
  }

  return <EditProductForm product={product} />;
}

function EditProductForm({ product }: { product: Product }) {
  const { updateProduct } = useProducts();
  const { confirmDelete } = useProductActions();
  const { showToast } = useToast();
  // L’état initial n’est lu qu’au montage : les mises à jour externes n’écrasent pas la saisie.
  const form = useProductForm(productToFormValues(product));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (input: ProductInput) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateProduct(product.id, input);
      goBack();
      showToast({ tone: 'success', message: 'Modifications enregistrées.' });
    } catch {
      setSubmitError('Enregistrement impossible. Réessayez.');
      setSubmitting(false);
    }
  };

  return (
    <ProductForm
      form={form}
      submitLabel="Enregistrer"
      onSubmit={handleSubmit}
      submitting={submitting}
      submitError={submitError}
      footer={
        <Button
          label="Supprimer le produit"
          icon="close-circle-outline"
          variant="danger"
          // Ferme l’édition et la fiche produit d’un coup : le produit n’existe plus.
          onPress={() => void confirmDelete(product, () => router.dismissAll())}
        />
      }
    />
  );
}
