import { useCallback, useRef, useState } from 'react';

import { guessCategory } from '@/services/images/foodImages';
import {
  describeLookupError,
  fetchProductByBarcode,
  isPlausibleBarcode,
  normalizeBarcode,
  type OffProductData,
} from '@/services/openFoodFacts/client';
import type { Product, ProductCategory, ProductInput, ProductLocation, ProductSource } from '@/types/product';
import { isValidLocalDate } from '@/utils/date';
import { parsePriceInput, priceToInput } from '@/utils/price';

export interface ProductFormValues {
  name: string;
  category: ProductCategory;
  quantity: string;
  priceText: string;
  expiresAt: string;
  location: ProductLocation;
  barcode: string;
  brand: string;
  notes: string;
  imageUri: string;
  source: ProductSource;
  /** Conservé tel quel à l’édition (non modifiable dans le formulaire). */
  openedAt?: string;
  /** Conservé tel quel à l’édition. */
  remaining?: number;
  /** Lieu (Premium) ; absent = la maison. */
  placeId?: string;
}

export type ProductFormErrors = Partial<Record<'name' | 'expiresAt' | 'priceText' | 'barcode', string>>;

export type LookupState =
  | { status: 'idle' }
  | { status: 'loading'; barcode: string }
  | { status: 'found'; barcode: string; name?: string }
  | { status: 'not_found'; barcode: string }
  | { status: 'error'; barcode: string; message: string };

export const NAME_MAX_LENGTH = 80;

export const EMPTY_FORM: ProductFormValues = {
  name: '',
  category: 'autre',
  quantity: '1',
  priceText: '',
  expiresAt: '',
  location: 'frigo',
  barcode: '',
  brand: '',
  notes: '',
  imageUri: '',
  source: 'manual',
};

export function productToFormValues(product: Product): ProductFormValues {
  return {
    name: product.name,
    category: product.category,
    quantity: product.quantity,
    priceText: priceToInput(product.price),
    expiresAt: product.expiresAt,
    location: product.location,
    barcode: product.barcode ?? '',
    brand: product.brand ?? '',
    notes: product.notes ?? '',
    imageUri: product.imageUri ?? '',
    source: product.source,
    openedAt: product.openedAt,
    remaining: product.remaining,
    placeId: product.placeId,
  };
}

/** Racheter / ajout express : mêmes informations qu’un produit déjà connu, date à choisir. */
export function productToRepurchaseValues(product: Product): ProductFormValues {
  return { ...productToFormValues(product), expiresAt: '', notes: '', openedAt: undefined, remaining: undefined };
}

export function validateProductForm(values: ProductFormValues): ProductFormErrors {
  const errors: ProductFormErrors = {};
  const name = values.name.trim();
  if (!name) errors.name = 'Indiquez le nom du produit.';
  else if (name.length > NAME_MAX_LENGTH) errors.name = `${NAME_MAX_LENGTH} caractères maximum.`;

  if (!values.expiresAt) errors.expiresAt = 'Choisissez une date de péremption.';
  else if (!isValidLocalDate(values.expiresAt)) errors.expiresAt = 'Date invalide.';

  if (parsePriceInput(values.priceText) === null) errors.priceText = 'Prix invalide (exemple : 2,50).';

  const barcode = normalizeBarcode(values.barcode);
  if (barcode && !isPlausibleBarcode(barcode)) errors.barcode = '8, 12, 13 ou 14 chiffres attendus.';

  return errors;
}

const optional = (value: string) => value.trim() || undefined;

export function formValuesToInput(values: ProductFormValues): ProductInput {
  return {
    name: values.name.trim(),
    category: values.category,
    quantity: values.quantity.trim() || '1',
    expiresAt: values.expiresAt,
    location: values.location,
    price: parsePriceInput(values.priceText) ?? undefined,
    imageUri: optional(values.imageUri),
    barcode: optional(normalizeBarcode(values.barcode)),
    brand: optional(values.brand),
    notes: optional(values.notes),
    source: values.source,
    openedAt: values.openedAt,
    remaining: values.remaining,
    placeId: values.placeId,
  };
}

/**
 * Applique une fiche Open Food Facts sans écraser ce que l’utilisateur a déjà saisi.
 * Une catégorie devinée d’après le nom cède la place à celle d’Open Food Facts ;
 * une catégorie choisie à la main est conservée.
 */
function mergeOffData(values: ProductFormValues, data: OffProductData, categoryAuto: boolean): ProductFormValues {
  const name = values.name.trim() ? values.name : (data.name ?? values.name);
  const category = categoryAuto
    ? data.category !== 'autre'
      ? data.category
      : (guessCategory(name) ?? values.category)
    : values.category === 'autre'
      ? data.category
      : values.category;
  return {
    ...values,
    barcode: data.barcode,
    name,
    brand: values.brand.trim() ? values.brand : (data.brand ?? ''),
    imageUri: data.imageUrl ?? values.imageUri,
    category,
    quantity: values.quantity.trim() && values.quantity !== '1' ? values.quantity : (data.quantity ?? values.quantity),
    source: 'open_food_facts',
  };
}

interface ProductFormOptions {
  /** Devine la catégorie d’après le nom tant que l’utilisateur ne l’a pas choisie (ajout uniquement). */
  autoCategory?: boolean;
}

export function useProductForm(initialValues: ProductFormValues = EMPTY_FORM, options: ProductFormOptions = {}) {
  const [values, setValues] = useState<ProductFormValues>(initialValues);
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [lookup, setLookup] = useState<LookupState>({ status: 'idle' });
  const lookupToken = useRef(0);
  // Ref lue dans les mises à jour d’état, état pour l’affichage.
  const initialAuto = options.autoCategory ?? false;
  const categoryAutoRef = useRef(initialAuto);
  const [categoryAuto, setCategoryAuto] = useState(initialAuto);

  const updateCategoryAuto = useCallback((auto: boolean) => {
    categoryAutoRef.current = auto;
    setCategoryAuto(auto);
  }, []);

  const setField = useCallback(
    <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => {
      if (key === 'category') updateCategoryAuto(false);
      setValues((prev) => {
        const next = { ...prev, [key]: value };
        // « Petits pains au beurre » → féculents, sans que l’utilisateur ait à chercher la catégorie.
        if (key === 'name' && categoryAutoRef.current) next.category = guessCategory(String(value)) ?? 'autre';
        return next;
      });
      setErrors((prev) => (key in prev ? { ...prev, [key]: undefined } : prev));
    },
    [updateCategoryAuto],
  );

  const lookupBarcode = useCallback(async (rawBarcode: string) => {
    const barcode = normalizeBarcode(rawBarcode);
    setValues((prev) => ({ ...prev, barcode }));
    setErrors((prev) => ({ ...prev, barcode: undefined }));

    const token = ++lookupToken.current;
    setLookup({ status: 'loading', barcode });
    const result = await fetchProductByBarcode(barcode);
    // Une recherche plus récente a été lancée entre-temps : on ignore celle-ci.
    if (token !== lookupToken.current) return;

    if (result.status === 'found') {
      setValues((prev) => mergeOffData(prev, result.product, categoryAutoRef.current));
      setErrors((prev) => ({ ...prev, name: undefined }));
      setLookup({ status: 'found', barcode, name: result.product.name });
    } else if (result.status === 'not_found') {
      setLookup({ status: 'not_found', barcode });
    } else {
      setLookup({ status: 'error', barcode, message: describeLookupError(result.reason) });
    }
  }, []);

  const removeImage = useCallback(() => setValues((prev) => ({ ...prev, imageUri: '' })), []);

  /** Remplace tout le formulaire (ajout express depuis un produit fréquent). */
  const replaceValues = useCallback(
    (next: ProductFormValues) => {
      updateCategoryAuto(false);
      setValues(next);
      setErrors({});
      setLookup({ status: 'idle' });
    },
    [updateCategoryAuto],
  );

  /** Valide et retourne les données prêtes à enregistrer, ou null en cas d’erreur. */
  const submit = useCallback((): ProductInput | null => {
    const nextErrors = validateProductForm(values);
    setErrors(nextErrors);
    return Object.values(nextErrors).some(Boolean) ? null : formValuesToInput(values);
  }, [values]);

  /** Vrai si la catégorie affichée a été devinée (et pas encore choisie par l’utilisateur). */
  const categoryGuessed = categoryAuto && values.name.trim() !== '' && values.category !== 'autre';

  return { values, errors, lookup, categoryGuessed, setField, lookupBarcode, removeImage, replaceValues, submit };
}

export type ProductFormController = ReturnType<typeof useProductForm>;
