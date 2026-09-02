import { computed, type ComputedRef } from 'vue'
import { useOfflineQueue, type QueuedAction } from '~/composables/use_offline_queue'
import type { BoatEquipmentActionRow } from '~/types/boat_show'
import type { InspectionKind } from '~/types/inspection'
import {
  CREATE_INSPECTION_ACTION,
  CREATE_INSPECTION_DEFECT_ACTION,
} from '#shared/constants/offline_queue'

/**
 * État des lieux saisi hors-ligne, **dérivé de la file** plutôt que d'un état
 * optimiste local (#622) : IndexedDB est la seule source de vérité, donc la
 * saisie survit à un rechargement de page — ce qu'un `ref` de composant ne fait
 * pas (cf. `BoatMaintenanceSheetItemList.vue`).
 *
 * Son `id` est le jeton temporaire de l'action de création : les défauts saisis
 * dans la foulée le référencent, et la synchro le remplace par l'ID réel.
 */
export interface PendingInspection {
  /** Jeton temporaire (`tmp_…`), jamais un ID de base. */
  id: string
  kind: InspectionKind
  performedAt: string
  fuelLevel: number | null
  engineHours: string | null
  notes: string | null
  /** Défauts encore en file rattachés à cet état des lieux. */
  actions: BoatEquipmentActionRow[]
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

/**
 * Défauts en file rendus comme des lignes lisibles par `InspectionDefects` —
 * ID négatif pour ne jamais collisionner avec une ligne réelle, suppression
 * désactivée en amont tant que l'état des lieux n'est pas synchronisé.
 */
function toPendingDefectRows(actions: QueuedAction[], tempId: string): BoatEquipmentActionRow[] {
  return actions
    .filter(
      (action) => action.type === CREATE_INSPECTION_DEFECT_ACTION && action.dependsOn === tempId
    )
    .map((action, index) => ({
      id: -(index + 1),
      boatId: 0,
      actionType: action.payload.actionType as BoatEquipmentActionRow['actionType'],
      status: 'pending' as const,
      label: asString(action.payload.label),
      notes: asString(action.payload.notes) || null,
      estimatedCost: asNumberOrNull(action.payload.estimatedCost),
      actualCost: null,
      equipmentType: (action.payload.equipmentType ??
        null) as BoatEquipmentActionRow['equipmentType'],
      equipmentId: asNumberOrNull(action.payload.equipmentId),
      inspectionId: null,
      resolvedAt: null,
      createdAt: action.createdAt,
      createdBy: 0,
    }))
}

export function usePendingInspection(
  boatId: number,
  reservationId: number,
  kind: InspectionKind
): ComputedRef<PendingInspection | null> {
  const { pendingActions } = useOfflineQueue()
  const createUrl = `/boats/${boatId}/reservations/${reservationId}/inspections`

  return computed(() => {
    const creation = pendingActions.value.find(
      (action) =>
        action.type === CREATE_INSPECTION_ACTION &&
        action.url === createUrl &&
        action.payload.kind === kind
    )
    if (!creation?.tempId) return null

    return {
      id: creation.tempId,
      kind,
      performedAt: asString(creation.payload.performedAt),
      fuelLevel: asNumberOrNull(creation.payload.fuelLevel),
      engineHours:
        creation.payload.engineHours === undefined || creation.payload.engineHours === null
          ? null
          : String(creation.payload.engineHours),
      notes: asString(creation.payload.notes) || null,
      actions: toPendingDefectRows(pendingActions.value, creation.tempId),
    }
  })
}
