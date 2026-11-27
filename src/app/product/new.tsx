import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/EmptyState';
import { LOCATION_PHRASE, ProductForm } from '@/components/ProductForm';
import { Button } from '@/components/ui/Button';
import { FREE_PRODUCT_LIMIT, remainingProductSlots } from '@/features/premium/limits';
import { allowedLots, lotInputs } from '@/features/products/lots';
import { MAIN_PLACE, productsInPlace } from '@/features/places/places';
import { usePlaces } from '@/features/places/PlacesProvider';
import { usePremium } from '@/features/premium/PremiumProvider';
import { useToast } from '@/features/feedback/ToastProvider';
import { useProducts } from '@/features/products/ProductsProvider';
import {
  EMPTY_FORM,
  productToRepurchaseValues,
  useProductForm,
  type ProductFormValues,
} from '@/features/products/useProductForm';
import { useShopping } from '@/features/shopping/ShoppingProvider';
import { CATEGORIES } from '@/constants/catalog';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { getExpiryLabel } from '@/utils/expiry';
import { daysUntil } from '@/utils/date';
import { describePurchaseHistory, findSimilarActive, frequentProducts, purchaseHistory } from '@/utils/products';
import type { ProductCategory, ProductInput } from '@/types/product';
import { goBack } from '@/utils/navigation';

type Params = {
  barcode?: string;
  scanId?: string;
  copyFrom?: string;
  /** Rangement d’un article de la liste de courses. */
  name?: string;
  category?: string;
  shoppingId?: string;
};

const asCategory = (value?: string): ProductCategory | undefined =>
  value && value in CATEGORIES ? (value as ProductCategory) : undefined;

export default function NewProductScreen() {
  const { activeProducts } = useProducts();
  const { isPremium, showPaywall } = usePremium();
  // Version gratuite pleine : on le dit avant la saisie plutôt qu’après, et rien n’est retiré.
  if (remainingProductSlots(activeProducts.length, isPremium) === 0) {
    return (
      <EmptyState
        icon="sparkles-outline"
        title={`${FREE_PRODUCT_LIMIT} produits suivis`}
        message={`C’est la limite de la version gratuite. Marquez des produits comme consommés ou jetés pour faire de la place, ou passez à Premium pour en suivre autant que vous voulez.`}
        action={
          <>
            <Button label="Découvrir Premium" icon="sparkles-outline" size="lg" onPress={() => showPaywall('products')} />
            <Button label="Retour au frigo" variant="ghost" onPress={goBack} />
          </>
        }
      />
    );
  }
  return <NewProductForm />;
}

function NewProductForm() {
  const { barcode, scanId, copyFrom, name, category, shoppingId } = useLocalSearchParams<Params>();
  const { addProduct, addProducts, products, activeProducts } = useProducts();
  const { isPremium } = usePremium();
  // Plusieurs lots identiques d’un coup, dans la limite des places libres de la version gratuite.
  const [lotCount, setLotCount] = useState(1);
  const freeSlots = remainingProductSlots(activeProducts.length, isPremium);
  const maxLots = allowedLots(freeSlots);
  const lots = Math.min(lotCount, maxLots);
  const { removeItem } = useShopping();
  const { showToast } = useToast();
  const { current, places } = usePlaces();
  const [initialValues] = useState<ProductFormValues>(() => {
    // « Racheter » depuis l’historique : mêmes informations (lieu compris), nouvelle date à choisir.
    const source = copyFrom ? products.find((p) => p.id === copyFrom) : undefined;
    if (source) return productToRepurchaseValues(source);
    // Sinon, le produit est rangé dans le lieu affiché sur l’accueil.
    const placeId = current.id === MAIN_PLACE.id ? undefined : current.id;
    // Depuis la liste de courses : nom et rayon déjà connus, il reste la date.
    if (name) return { ...EMPTY_FORM, name, category: asCategory(category) ?? EMPTY_FORM.category, placeId };
    return { ...EMPTY_FORM, placeId };
  });
  const form = useProductForm(initialValues, { autoCategory: !copyFrom && !asCategory(category) });
  const { lookupBarcode } = form;
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Calculé une fois à l’ouverture : la liste ne bouge pas pendant la saisie.
  const [frequent] = useState(() => frequentProducts(products, 10));

  // Retour du scanner : chaque scan porte un identifiant unique pour relancer la recherche.
  useEffect(() => {
    if (barcode) void lookupBarcode(barcode);
  }, [barcode, scanId, lookupBarcode]);

  // Prévenir d’un doublon sans bloquer : on rachète parfois volontairement.
  const typedName = useDebouncedValue(form.values.name, 400);
  // Doublon cherché dans le lieu où l’on range : un yaourt à la maison n’en fait pas un au bureau.
  const similar = findSimilarActive(productsInPlace(products, form.values.placeId ?? MAIN_PLACE.id, places), typedName);
  const pastPurchases = purchaseHistory(products, typedName);
  const historyNote = pastPurchases ? describePurchaseHistory(pastPurchases) : null;
  const nameNotice = similar
    ? `Vous avez déjà « ${similar.name} » ${LOCATION_PHRASE[similar.location]} (${getExpiryLabel(daysUntil(similar.expiresAt)).toLowerCase()}).`
    : historyNote?.warn
      ? historyNote.text
      : null;
  // Rappel neutre (sans alerte) quand le produit est connu et qu’aucune mise en garde n’est affichée.
  const nameHint = !nameNotice && historyNote ? historyNote.text : null;

  const handleSubmit = async (input: ProductInput) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      if (lots > 1) await addProducts(lotInputs(input, lots));
      else await addProduct(input);
      // L’article acheté quitte la liste de courses : il est désormais suivi dans l’app.
      if (shoppingId) await removeItem(shoppingId).catch(() => undefined);
      goBack();
      showToast({
        tone: 'success',
        message: lots > 1 ? `${lots} lots de « ${input.name} » ont été ajoutés.` : `« ${input.name} » a été ajouté.`,
      });
    } catch {
      setSubmitError('Enregistrement impossible. Réessayez.');
      setSubmitting(false);
    }
  };

  return (
    <ProductForm
      form={form}
      submitLabel={`Ajouter ${lots > 1 ? `${lots} lots ` : ''}${LOCATION_PHRASE[form.values.location]}`}
      lots={{
        value: lots,
        max: maxLots,
        onChange: setLotCount,
        note:
          Number.isFinite(freeSlots) && freeSlots <= lots
            ? `Version gratuite : ${freeSlots > 1 ? `${freeSlots} places libres` : '1 place libre'} dans votre frigo.`
            : null,
      }}
      onSubmit={handleSubmit}
      submitting={submitting}
      submitError={submitError}
      suggestDate
      frequent={frequent}
      nameNotice={nameNotice}
      nameHint={nameHint}
      history={products}
      onScanPress={() => router.push('/scan')}
      onReceiptPress={copyFrom || name ? undefined : () => router.replace('/receipt')}
    />
  );
}
