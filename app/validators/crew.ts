import vine from '@vinejs/vine'

export const createCrewMemberValidator = vine.create(
  vine.object({
    firstName: vine.string().trim().minLength(1).maxLength(100),
    lastName: vine.string().trim().minLength(1).maxLength(100),
    email: vine.string().trim().email().maxLength(255).optional(),
    phone: vine.string().trim().maxLength(50).optional(),
    notes: vine.string().trim().maxLength(5000).optional(),
  })
)

export const updateCrewMemberValidator = vine.create(
  vine.object({
    firstName: vine.string().trim().minLength(1).maxLength(100),
    lastName: vine.string().trim().minLength(1).maxLength(100),
    email: vine.string().trim().email().maxLength(255).optional(),
    phone: vine.string().trim().maxLength(50).optional(),
    notes: vine.string().trim().maxLength(5000).optional(),
  })
)

export const createCrewCertificationValidator = vine.create(
  vine.object({
    type: vine.enum([
      'coastal_permit',
      'offshore_permit',
      'vhf',
      'stcw_basic',
      'stcw_proficiency',
      'other',
    ] as const),
    referenceNumber: vine.string().trim().maxLength(100).optional(),
    expiresAt: vine.date({ formats: ['YYYY-MM-DD'] }).optional(),
  })
)

export const syncNavigationLogCrewValidator = vine.create(
  vine.object({
    crew: vine.array(
      vine.object({
        crewMemberId: vine.number().withoutDecimals().positive(),
        role: vine.enum(['skipper', 'crew', 'passenger'] as const),
      })
    ),
  })
)
