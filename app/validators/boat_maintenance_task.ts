import { MAINTENANCE_SUBJECTS } from '#shared/constants/maintenance/maintenance_subjects'
import vine from '@vinejs/vine'

function optionalIdFromForm() {
  return vine
    .string()
    .trim()
    .optional()
    .transform((s) => {
      if (s === undefined || s === '') return null
      const n = Number.parseInt(s, 10)
      if (!Number.isInteger(n) || n < 1) return null
      return n
    })
}

function optionalNonNegativeIntFromForm() {
  return vine
    .string()
    .trim()
    .optional()
    .transform((s) => {
      if (s === undefined || s === '') return null
      const n = Number.parseInt(s, 10)
      if (!Number.isInteger(n) || n < 0) return null
      return n
    })
}

export const createBoatMaintenanceTaskValidator = vine.create(
  vine.object({
    subject: vine.enum(MAINTENANCE_SUBJECTS).optional(),
    boatEngineId: optionalIdFromForm(),
    boatSailId: optionalIdFromForm(),
    boatRigId: optionalIdFromForm(),
    boatSafetyEquipmentId: optionalIdFromForm(),
    boatGenericEquipmentId: optionalIdFromForm(),
    boatIncidentId: optionalIdFromForm(),
    title: vine.string().trim().minLength(1).maxLength(200),
    notes: vine.string().trim().optional(),

    dueAt: vine
      .date()
      .parse((v) => (v === '' || v === null || v === undefined ? null : v))
      .optional(),
    recurrenceIntervalMonths: optionalNonNegativeIntFromForm(),

    dueEngineHours: optionalNonNegativeIntFromForm(),
    recurrenceIntervalEngineHours: optionalNonNegativeIntFromForm(),
  })
)

/**
 * Modification d'une tâche planifiée (#867). Tous les champs sont optionnels :
 * une clé absente laisse le champ intact, une valeur vide (convertie en `null`
 * par le bodyparser) le vide — d'où `nullable().optional()`, car `optional()`
 * seul efface les `null` et rendrait un champ impossible à vider.
 */
export const updateBoatMaintenanceTaskValidator = vine.create(
  vine.object({
    title: vine.string().trim().minLength(1).maxLength(200).optional(),
    notes: vine.string().trim().nullable().optional(),
    dueAt: vine.date().nullable().optional(),
    recurrenceIntervalMonths: vine.number().withoutDecimals().min(0).nullable().optional(),
    dueEngineHours: vine.number().withoutDecimals().min(0).nullable().optional(),
    recurrenceIntervalEngineHours: vine.number().withoutDecimals().min(0).nullable().optional(),
  })
)

export const markBoatMaintenanceTaskDoneValidator = vine.create(
  vine.object({
    doneAt: vine
      .date()
      .parse((v) => (v === '' || v === null || v === undefined ? null : v))
      .optional(),
    doneEngineHours: optionalNonNegativeIntFromForm(),
  })
)
