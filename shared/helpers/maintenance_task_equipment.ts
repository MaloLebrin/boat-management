import type { EquipmentReferenceType } from '#shared/constants/equipment_action'
import type { MaintenanceSubject } from '#shared/constants/maintenance/maintenance_subjects'
import type { GenericEquipmentCategory } from '#shared/types/boat'
import type { TaskEquipmentRef } from '#shared/types/maintenance'

/** Nom du champ de formulaire / colonne camelCase portant la FK de l'équipement. */
export type TaskEquipmentField =
  | 'boatEngineId'
  | 'boatSailId'
  | 'boatRigId'
  | 'boatSafetyEquipmentId'
  | 'boatGenericEquipmentId'

const FIELD_BY_TYPE: Record<EquipmentReferenceType, TaskEquipmentField> = {
  engine: 'boatEngineId',
  sail: 'boatSailId',
  rig: 'boatRigId',
  safety: 'boatSafetyEquipmentId',
  generic: 'boatGenericEquipmentId',
}

const SUBJECT_BY_GENERIC_CATEGORY: Record<GenericEquipmentCategory, MaintenanceSubject> = {
  electrical: 'electrical',
  energy: 'electrical',
  plumbing: 'plumbing',
  deck: 'deck',
  anchoring: 'deck',
  navigation: 'other',
  comfort: 'other',
}

/**
 * Sujet de tâche déduit de l'équipement visé. Les équipements dédiés ont un
 * sujet fixe ; un équipement générique se déduit de sa catégorie.
 */
export function subjectForEquipment(
  type: EquipmentReferenceType,
  genericCategory?: GenericEquipmentCategory | null
): MaintenanceSubject {
  if (type === 'generic') {
    return genericCategory ? SUBJECT_BY_GENERIC_CATEGORY[genericCategory] : 'other'
  }
  return type
}

/**
 * Sujet imposé par un équipement dédié, `null` pour un équipement générique
 * (qui accepte n'importe quel sujet).
 */
export function requiredSubjectForEquipment(
  type: EquipmentReferenceType
): MaintenanceSubject | null {
  return type === 'generic' ? null : type
}

export function equipmentFieldName(type: EquipmentReferenceType): TaskEquipmentField {
  return FIELD_BY_TYPE[type]
}

type TaskEquipmentColumns = Partial<Record<TaskEquipmentField, number | null>>

/** Tous les équipements renseignés sur une tâche (ou un payload), dans l'ordre des types. */
export function equipmentRefsOf(task: TaskEquipmentColumns): TaskEquipmentRef[] {
  return (Object.keys(FIELD_BY_TYPE) as EquipmentReferenceType[]).flatMap((type) => {
    const id = task[FIELD_BY_TYPE[type]]
    return typeof id === 'number' ? [{ type, id }] : []
  })
}

/** L'équipement d'une tâche, `null` si elle vise le bateau entier. */
export function equipmentRefOf(task: TaskEquipmentColumns): TaskEquipmentRef | null {
  return equipmentRefsOf(task)[0] ?? null
}
