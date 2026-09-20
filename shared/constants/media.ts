export const MEDIA_ENTITY_TYPES = [
  'boat',
  'boat_engine',
  'boat_engine_part',
  'boat_sail',
  'boat_rig',
  'boat_generic_equipment',
  'boat_safety_equipment',
  'boat_maintenance_event',
  'boat_document',
  'inspection',
  'rentalContract',
  'client',
  'user',
] as const

export type MediaEntityType = (typeof MEDIA_ENTITY_TYPES)[number]

export const MEDIA_KINDS = ['photo', 'document'] as const

export type MediaKind = (typeof MEDIA_KINDS)[number]

/**
 * Contraintes des envois groupés — source unique (#764).
 *
 * Elles n'étaient écrites que dans `app/validators/media.ts`, et **nulle part**
 * dans le middleware qui écrit les parties sur disque. Résultat : le middleware
 * acceptait n'importe quelle partie, de n'importe quelle taille, en n'importe
 * quel nombre, et le tri n'arrivait qu'une fois les octets écrits. Les deux
 * couches lisent désormais les mêmes valeurs.
 */

export const PHOTO_EXTNAMES = ['jpg', 'jpeg', 'png', 'heic', 'webp', 'gif'] as const
export const DOCUMENT_EXTNAMES = ['pdf', 'csv', 'xlsx', 'docx', 'doc'] as const

export const PHOTO_MAX_SIZE_MB = 10
export const DOCUMENT_MAX_SIZE_MB = 20

/** Nombre maximum de fichiers par envoi groupé. */
export const MAX_FILES_PER_BATCH = 20

export type MediaBatchKind = 'photos' | 'documents'

export const MEDIA_BATCH_RULES: Record<
  MediaBatchKind,
  { extnames: readonly string[]; maxSizeMb: number }
> = {
  photos: { extnames: PHOTO_EXTNAMES, maxSizeMb: PHOTO_MAX_SIZE_MB },
  documents: { extnames: DOCUMENT_EXTNAMES, maxSizeMb: DOCUMENT_MAX_SIZE_MB },
}

/**
 * Nature d'une route d'envoi groupé, déduite de son motif.
 *
 * Les douze routes de `LARGE_UPLOAD_ROUTES` se terminent toutes par `/photos`
 * ou `/documents` — `tests/unit/hygiene/large_upload_routes.spec.ts` le fige,
 * pour qu'une treizième route n'arrive pas sans plafond adapté.
 */
export function mediaBatchKindFor(routePattern: string): MediaBatchKind | null {
  if (routePattern.endsWith('/photos')) return 'photos'
  if (routePattern.endsWith('/documents')) return 'documents'
  return null
}

/**
 * Plafond de charge utile d'une route d'envoi groupé : ce que le validateur
 * laissera passer au mieux, et rien de plus.
 *
 * Une seule valeur de 400 Mo couvrait les douze routes, soit **le double** de
 * ce qu'un lot de photos peut atteindre (20 × 10 Mo).
 */
export function largeUploadLimitFor(routePattern: string): string {
  const kind = mediaBatchKindFor(routePattern)
  const maxSizeMb = kind ? MEDIA_BATCH_RULES[kind].maxSizeMb : DOCUMENT_MAX_SIZE_MB
  return `${maxSizeMb * MAX_FILES_PER_BATCH}mb`
}

/** Extension en minuscules d'un nom de fichier, sans le point. */
export function extnameOf(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot === -1 ? '' : filename.slice(dot + 1).toLowerCase()
}
