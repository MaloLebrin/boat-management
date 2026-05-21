import type { MediaEntityType, MediaKind } from '#shared/constants/media'

export type UploadMediaPayload = {
  folder: string
  entityType: MediaEntityType
  entityId: number
  kind: MediaKind
  caption?: string | null
}
