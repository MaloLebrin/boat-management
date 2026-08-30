import type { MediaRow } from '~/types/boat_show'
import type { BoatInspectionItemRow, BoatInspectionRow } from '../../shared/types/inspection'
import type { BoatEquipmentActionRow } from '../../shared/types/equipment_action'

export type {
  InspectionKind,
  InspectionItemState,
  BoatInspectionRow,
  BoatInspectionItemRow,
} from '../../shared/types/inspection'

export type InspectionWithPhotos = BoatInspectionRow & {
  photos: MediaRow[]
  /** Equipment actions raised from this inspection (#311). */
  actions: BoatEquipmentActionRow[]
  /** Constats de la checklist d'état des lieux (#584). */
  items: BoatInspectionItemRow[]
}
