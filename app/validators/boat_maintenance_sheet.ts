import { SHEET_TYPES } from '#shared/types/maintenance'
import vine from '@vinejs/vine'

export const sheetTypes = SHEET_TYPES

export const createBoatMaintenanceSheetValidator = vine.create(
  vine.object({
    type: vine.enum(sheetTypes),
    title: vine.string().trim().minLength(2).maxLength(200),
    performedAt: vine.date(),
    notes: vine.string().trim().maxLength(5000).nullable().optional(),
  })
)

export const updateSheetItemValidator = vine.create(
  vine.object({
    isDone: vine.boolean(),
    notes: vine.string().trim().maxLength(500).nullable().optional(),
  })
)
