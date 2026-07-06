import type { MediaRow } from '~/types/boat_show'
import type { BoatInspectionRow } from '../../shared/types/inspection'

export type { InspectionKind, BoatInspectionRow } from '../../shared/types/inspection'

export type InspectionWithPhotos = BoatInspectionRow & {
  photos: MediaRow[]
}
