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
    subject: vine.enum(MAINTENANCE_SUBJECTS),
    boatEngineId: optionalIdFromForm(),
    boatSailId: optionalIdFromForm(),
    boatRigId: optionalIdFromForm(),
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

export const markBoatMaintenanceTaskDoneValidator = vine.create(
  vine.object({
    doneAt: vine
      .date()
      .parse((v) => (v === '' || v === null || v === undefined ? null : v))
      .optional(),
    doneEngineHours: optionalNonNegativeIntFromForm(),
  })
)
