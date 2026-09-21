import type {
  IncidentTargetColumns,
  IncidentTargetField,
  IncidentTargetRef,
  IncidentTargetType,
} from '#shared/types/incident'

/**
 * Miroir de `maintenance_task_equipment.ts` pour la cible d'un incident (#813) :
 * mêmes cinq familles, plus la pièce moteur. Pas de notion de « sujet ».
 */
const FIELD_BY_TYPE: Record<IncidentTargetType, IncidentTargetField> = {
  engine: 'boatEngineId',
  sail: 'boatSailId',
  rig: 'boatRigId',
  safety: 'boatSafetyEquipmentId',
  generic: 'boatGenericEquipmentId',
  engine_part: 'boatEnginePartId',
}

export const INCIDENT_TARGET_FIELDS = Object.values(FIELD_BY_TYPE) as IncidentTargetField[]

export function incidentTargetFieldName(type: IncidentTargetType): IncidentTargetField {
  return FIELD_BY_TYPE[type]
}

/** Toutes les cibles renseignées sur un incident (ou un payload), dans l'ordre des types. */
export function incidentTargetRefsOf(columns: IncidentTargetColumns): IncidentTargetRef[] {
  return (Object.keys(FIELD_BY_TYPE) as IncidentTargetType[]).flatMap((type) => {
    const id = columns[FIELD_BY_TYPE[type]]
    return typeof id === 'number' ? [{ type, id }] : []
  })
}

/** La cible d'un incident, `null` s'il vise le bateau entier. */
export function incidentTargetRefOf(columns: IncidentTargetColumns): IncidentTargetRef | null {
  return incidentTargetRefsOf(columns)[0] ?? null
}

/**
 * Les six colonnes FK à `null`, sauf celle de `ref` : ce que le service écrit
 * pour poser (ou retirer, `ref = null`) la cible d'un incident.
 */
export function incidentTargetColumns(
  ref: IncidentTargetRef | null
): Record<IncidentTargetField, number | null> {
  const columns = Object.fromEntries(
    INCIDENT_TARGET_FIELDS.map((field) => [field, null])
  ) as Record<IncidentTargetField, number | null>
  if (ref) columns[FIELD_BY_TYPE[ref.type]] = ref.id
  return columns
}

/** Vrai si au moins une colonne FK est présente dans le payload (même à `null`). */
export function hasIncidentTargetInput(columns: IncidentTargetColumns): boolean {
  return INCIDENT_TARGET_FIELDS.some((field) => columns[field] !== undefined)
}
