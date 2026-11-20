import * as ImagePicker from 'expo-image-picker';

/**
 * Lecture du texte d’une photo (ticket, date sur l’emballage), entièrement sur le téléphone
 * (Apple Vision sur iOS, ML Kit sur Android) : la photo n’est envoyée nulle part.
 */
export class PhotoTextError extends Error {}

type TextExtractor = { isSupported: boolean; extractTextFromImage: (uri: string) => Promise<string[]> };

/** Chargé à la demande : le module natif est absent d’Expo Go, l’app ne doit pas planter au démarrage. */
async function loadExtractor(): Promise<TextExtractor | null> {
  try {
    const module = (await import('expo-text-extractor')) as TextExtractor;
    return module.isSupported ? module : null;
  } catch {
    return null;
  }
}

export async function isTextRecognitionAvailable(): Promise<boolean> {
  return (await loadExtractor()) !== null;
}

export async function recognizeText(uri: string): Promise<string[]> {
  const extractor = await loadExtractor();
  if (!extractor) {
    throw new PhotoTextError('La lecture de texte n’est pas disponible dans cette version de l’app (Expo Go).');
  }
  try {
    return await extractor.extractTextFromImage(uri);
  } catch {
    throw new PhotoTextError('Impossible de lire cette photo. Réessayez avec une image nette et bien éclairée.');
  }
}

interface PickPhotoOptions {
  /** Recadrage carré proposé à l’utilisateur (photo de produit). */
  square?: boolean;
  quality?: number;
}

/** Photo (appareil photo ou galerie) ; null si l’utilisateur annule. */
export async function pickPhoto(source: 'camera' | 'library', { square = false, quality = 1 }: PickPhotoOptions = {}): Promise<string | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new PhotoTextError('Autorisez l’appareil photo pour SmartFridge dans les réglages du téléphone.');
    }
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality,
    allowsEditing: square,
    aspect: square ? [1, 1] : undefined,
  };
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  return result.assets[0]?.uri ?? null;
}
