import { AUDIT_ACTIONS } from '#shared/types/audit_log'
import vine from '@vinejs/vine'

export const auditLogFiltersValidator = vine.create(
  vine.object({
    userId: vine.number().optional(),
    action: vine.enum(AUDIT_ACTIONS).optional(),
    from: vine
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}/)
      .optional(),
    to: vine
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}/)
      .optional(),
    page: vine.number().min(1).optional(),
  })
)
