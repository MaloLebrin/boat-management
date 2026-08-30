import { INSPECTION_ITEM_STATES } from '#shared/types/inspection'
import vine from '@vinejs/vine'

const inspectionKindChoices = ['checkout', 'checkin'] as const

export const createBoatInspectionValidator = vine.create(
  vine.object({
    kind: vine.enum(inspectionKindChoices),
    performedAt: vine.date({ formats: ['YYYY-MM-DDTHH:mm', 'YYYY-MM-DD'] }),
    // browser's getTimezoneOffset() — shifts the naive local datetime to UTC
    tzOffsetMinutes: vine.number().withoutDecimals().optional(),
    fuelLevel: vine.number().min(0).max(100).withoutDecimals().optional(),
    engineHours: vine.number().min(0).max(9999.99).optional(),
    notes: vine.string().trim().optional(),
  })
)

export const updateBoatInspectionValidator = vine.create(
  vine.object({
    performedAt: vine.date({ formats: ['YYYY-MM-DDTHH:mm', 'YYYY-MM-DD'] }).optional(),
    // browser's getTimezoneOffset() — shifts the naive local datetime to UTC
    tzOffsetMinutes: vine.number().withoutDecimals().optional(),
    fuelLevel: vine.number().min(0).max(100).withoutDecimals().optional(),
    engineHours: vine.number().min(0).max(9999.99).optional(),
    notes: vine.string().trim().optional(),
  })
)

// Constat sur un point de contrôle de la checklist (#584). La forme seule est
// validée ici (longueur alignée sur la colonne) — l'appartenance de `itemKey`
// au corpus se vérifie dans le service, comme `stepKey` côté diagnostic.
export const setBoatInspectionItemValidator = vine.create(
  vine.object({
    itemKey: vine.string().trim().maxLength(64),
    state: vine.enum(INSPECTION_ITEM_STATES),
    // Un constat non-OK sans explication n'est pas exploitable au check-in.
    note: vine
      .string()
      .trim()
      .maxLength(500)
      .optional()
      .requiredWhen('state', 'in', ['remark', 'damage']),
  })
)

export const clearBoatInspectionItemValidator = vine.create(
  vine.object({
    itemKey: vine.string().trim().maxLength(64),
  })
)
