import type { MediaEntityType } from '#shared/constants/media'

/**
 * Equipment kinds that can own photos. The slug is inferred from the route
 * params by the controller — it never comes from user input directly.
 */
export const EQUIPMENT_MEDIA_SLUGS = [
  'engine',
  'engine-part',
  'sail',
  'rig',
  'generic',
  'safety',
] as const

export type EquipmentMediaSlug = (typeof EQUIPMENT_MEDIA_SLUGS)[number]

/**
 * Everything the controller needs once ownership has been verified.
 */
export interface ResolvedEquipmentMedia {
  entityType: MediaEntityType
  entityId: number
  photoFolder: string
  photosUrl: string
}

/**
 * `ok: false` means the ownership chain (org → boat → equipment) did not hold:
 * the caller must redirect without touching any media.
 */
export type EquipmentMediaResolution =
  | { ok: true; resolved: ResolvedEquipmentMedia }
  | { ok: false; redirectTo: string }
