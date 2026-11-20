/**
 * Photos personnelles : stockées dans le dossier privé de l’app et référencées par un chemin
 * relatif (« local:photos/abc.jpg »). Sur iOS, le chemin absolu du dossier change à chaque
 * mise à jour de l’app : on ne l’enregistre donc jamais en base.
 */
export const LOCAL_PHOTO_PREFIX = 'local:';

export const isLocalPhoto = (uri: string | undefined): uri is string => !!uri && uri.startsWith(LOCAL_PHOTO_PREFIX);

/** Chemin relatif au dossier Documents (« photos/abc.jpg »). */
export const localPhotoPath = (uri: string): string => uri.slice(LOCAL_PHOTO_PREFIX.length);
