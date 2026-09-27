import type { MediaEntityType, MediaKind } from '#shared/constants/media'

export type CloudinaryUploadOptions = {
  publicId?: string
  tags?: string[]
  transformation?: Record<string, unknown>[]
}

export type UploadMediaPayload = {
  folder: string
  entityType: MediaEntityType
  entityId: number
  kind: MediaKind
  caption?: string | null
}

export interface MediaReconciliationOptions {
  /** Audit seul : rien n'est supprimé ni corrigé, le rapport décrit l'écart. */
  dryRun: boolean
}

/** Écart entre le compteur `storage_used_bytes` d'une organisation et ses médias. */
export interface StorageDrift {
  organizationId: number
  recordedBytes: number
  actualBytes: number
}

export interface MediaReconciliationReport {
  dryRun: boolean
  orphans: {
    /** Lignes `media` dont l'entité propriétaire n'existe plus. */
    found: number
    deleted: number
    /** Suppressions Cloudinary en échec : la ligne est gardée pour la prochaine passe. */
    failed: number
    bytes: number
    byEntityType: Partial<Record<MediaEntityType, number>>
    /** Lignes dont l'`entity_type` n'est pas dans `MEDIA_ENTITY_TYPES` : signalées, jamais supprimées. */
    unknownEntityType: number
  }
  storage: {
    drifts: StorageDrift[]
    corrected: number
    /** Compteur modifié entre la lecture et l'écriture (upload concurrent) : laissé tel quel. */
    skipped: number
  }
}
