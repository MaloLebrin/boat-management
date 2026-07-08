import type { MediaRow } from '~/types/boat_show'
import type { BoatInspectionRow } from '../../shared/types/inspection'
import type { BoatEquipmentActionRow } from '../../shared/types/equipment_action'

export type { InspectionKind, BoatInspectionRow } from '../../shared/types/inspection'

export type InspectionWithPhotos = BoatInspectionRow & {
  photos: MediaRow[]
  /** Equipment actions raised from this inspection (#311). */
  actions: BoatEquipmentActionRow[]
}
