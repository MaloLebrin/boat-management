import { DIAGNOSTIC_RESET_SCOPES } from '#shared/types/diagnostic'
import vine from '@vinejs/vine'

export const toggleDiagnosticStepValidator = vine.create(
  vine.object({
    stepKey: vine.string().trim().maxLength(64),
    checked: vine.boolean(),
  })
)

export const resetDiagnosticValidator = vine.create(
  vine.object({
    scope: vine.enum(DIAGNOSTIC_RESET_SCOPES).optional(),
  })
)
