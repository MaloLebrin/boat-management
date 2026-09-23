import {
  EQUIPMENT_REFERENCE_TYPES,
  type EquipmentReferenceType,
} from '#shared/constants/equipment_action'
import type { BoatIncidentRow, IncidentTargetSummary } from '#shared/types/incident'
import type { TaskEquipmentRef, TaskFormPrefill } from '#shared/types/maintenance'
import type { EquipmentActionPrefill } from '~/types/boat_show'

/**
 * Suites d'un incident (#815) : pré-remplissage des modales de tâche et
 * d'action depuis une carte d'incident, et comptage des suites déjà créées.
 *
 * La cible d'un incident peut être une pièce moteur, que ni les tâches ni les
 * actions ne savent viser : on ne la rabat **pas** sur son moteur, la pièce
 * reste tracée par l'incident seul.
 */

/** Équipement d'une tâche ou d'une action équivalent à la cible de l'incident, `null` pour une pièce ou le bateau entier. */
export function equipmentRefOfIncidentTarget(
  target: IncidentTargetSummary | null
): TaskEquipmentRef | null {
  if (!target) return null
  const isEquipment = (EQUIPMENT_REFERENCE_TYPES as readonly string[]).includes(target.type)
  if (!isEquipment) return null
  return { type: target.type as EquipmentReferenceType, id: target.id }
}

export interface IncidentTaskPrefill {
  prefill: TaskFormPrefill
  /** Équipement figé dans le formulaire dès que l'incident vise un équipement. */
  lockEquipment: boolean
}

export function taskPrefillForIncident(
  incident: Pick<BoatIncidentRow, 'id' | 'target'>,
  title: string
): IncidentTaskPrefill {
  const equipment = equipmentRefOfIncidentTarget(incident.target)
  return {
    prefill: { title, boatIncidentId: incident.id, ...(equipment ? { equipment } : {}) },
    lockEquipment: equipment !== null,
  }
}

export function actionPrefillForIncident(
  incident: Pick<BoatIncidentRow, 'id' | 'target'>,
  label: string
): EquipmentActionPrefill {
  const equipment = equipmentRefOfIncidentTarget(incident.target)
  return {
    label,
    actionType: 'to_repair',
    boatIncidentId: incident.id,
    ...(equipment ? { equipmentType: equipment.type, equipmentId: equipment.id } : {}),
  }
}

/** Nombre de tâches et d'actions tracées par l'incident, depuis les props déjà chargées. */
export function countFollowUps(
  incidentId: number,
  tasks: ReadonlyArray<{ boatIncidentId: number | null }>,
  actions: ReadonlyArray<{ boatIncidentId: number | null }>
): number {
  return (
    tasks.filter((task) => task.boatIncidentId === incidentId).length +
    actions.filter((action) => action.boatIncidentId === incidentId).length
  )
}
