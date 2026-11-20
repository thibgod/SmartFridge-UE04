import { Directory, File, Paths } from 'expo-file-system';

import { createId } from '@/utils/id';
import { isLocalPhoto, LOCAL_PHOTO_PREFIX, localPhotoPath } from '@/utils/photo';

const PHOTO_DIR = 'photos';

/** Adresse affichable d’une photo : locale résolue dans le dossier de l’app, distante inchangée. */
export function resolvePhotoUri(uri: string | undefined): string | undefined {
  if (!isLocalPhoto(uri)) return uri;
  return new File(Paths.document, localPhotoPath(uri)).uri;
}

/** Copie une photo prise ou choisie dans le dossier privé de l’app. Rien ne quitte le téléphone. */
export async function savePhoto(tempUri: string): Promise<string> {
  const directory = new Directory(Paths.document, PHOTO_DIR);
  directory.create({ idempotent: true, intermediates: true });
  const name = `${createId()}.jpg`;
  await new File(tempUri).copy(new File(directory, name));
  return `${LOCAL_PHOTO_PREFIX}${PHOTO_DIR}/${name}`;
}

/**
 * Supprime les photos qui ne sont plus utilisées (produit supprimé, photo remplacée,
 * formulaire abandonné). Appelé au démarrage, quand plus aucun formulaire n’est ouvert.
 */
export function prunePhotos(referenced: readonly (string | undefined)[]): number {
  const directory = new Directory(Paths.document, PHOTO_DIR);
  if (!directory.exists) return 0;
  const keep = new Set(referenced.filter(isLocalPhoto).map((uri) => localPhotoPath(uri).split('/').pop()));
  let removed = 0;
  for (const entry of directory.list()) {
    if (entry instanceof File && !keep.has(entry.name)) {
      entry.delete();
      removed += 1;
    }
  }
  return removed;
}
