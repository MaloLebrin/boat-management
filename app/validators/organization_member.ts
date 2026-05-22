import vine from '@vinejs/vine'

export const inviteMemberValidator = vine.compile(
  vine.object({
    email: vine.string().email().trim().toLowerCase(),
    role: vine.enum(['admin', 'member'] as const),
  })
)

export const updateMemberRoleValidator = vine.compile(
  vine.object({
    role: vine.enum(['admin', 'member'] as const),
  })
)
