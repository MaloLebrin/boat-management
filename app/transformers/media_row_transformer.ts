import type Media from '#models/media'

/**
 * Shape consumed by the frontend `MediaRow` type (inertia/types/boat_show.ts).
 * Kept as a plain mapper so any entity's media (boat, client…) can be exposed
 * uniformly to Inertia pages.
 */
export interface MediaRowDto {
  id: number
  kind: 'photo' | 'document'
  secureUrl: string
  originalFilename: string
  format: string
  bytes: number
  width: number | null
  height: number | null
  position: number
  caption: string | null
}

export function toMediaRow(m: Media): MediaRowDto {
  return {
    id: m.id,
    kind: m.kind as 'photo' | 'document',
    secureUrl: m.secureUrl,
    originalFilename: m.originalFilename,
    format: m.format,
    bytes: m.bytes,
    width: m.width,
    height: m.height,
    position: m.position,
    caption: m.caption,
  }
}
