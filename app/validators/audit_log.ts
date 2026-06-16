import vine from '@vinejs/vine'

const auditActions = [
  'login',
  'logout',
  'boat.create',
  'boat.update',
  'boat.delete',
  'member.add',
  'member.remove',
  'member.update_role',
] as const

export const auditLogFiltersValidator = vine.compile(
  vine.object({
    userId: vine.number().optional(),
    action: vine.enum(auditActions).optional(),
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
