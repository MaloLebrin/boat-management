import { MAINTENANCE_SUBJECTS } from '#shared/constants/maintenance/maintenance_subjects'
import vine from '@vinejs/vine'

/** Réexport historique — la source unique est `maintenance_subjects.ts`. */
export const maintenanceSubjects = MAINTENANCE_SUBJECTS

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

function optionalDecimalFromForm() {
  return vine
    .string()
    .trim()
    .optional()
    .transform((s) => {
      if (s === undefined || s === '') return null
      const n = Number.parseFloat(s)
      if (!Number.isFinite(n) || n < 0) return null
      return String(Math.round(n * 100) / 100)
    })
}

export const createBoatMaintenanceValidator = vine.create(
  vine.object({
    subject: vine.enum(MAINTENANCE_SUBJECTS),
    boatEngineId: optionalIdFromForm(),
    boatSailId: optionalIdFromForm(),
    boatRigId: optionalIdFromForm(),
    boatSafetyEquipmentId: optionalIdFromForm(),
    engineCaption: vine.string().trim().maxLength(240).nullable().optional(),
    sailCaption: vine.string().trim().maxLength(240).nullable().optional(),
    performedAt: vine.date(),
    title: vine.string().trim().minLength(2).maxLength(200),
    notes: vine.string().trim().maxLength(8000).nullable().optional(),
    parts: vine
      .array(
        vine.object({
          name: vine.string().trim().optional(),
          quantity: vine.string().trim().optional(),
          notes: vine.string().trim().maxLength(500).nullable().optional(),
          enginePartId: optionalIdFromForm(),
          unitPrice: optionalDecimalFromForm(),
        })
      )
      .optional(),
  })
)
