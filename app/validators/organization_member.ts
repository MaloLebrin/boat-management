import vine from '@vinejs/vine'

export const inviteMemberValidator = vine.create(
  vine.object({
    email: vine.string().email().trim().toLowerCase(),
    role: vine.enum(['admin', 'member', 'mechanic', 'boat_owner'] as const),
    boatIds: vine.array(vine.number().positive()).optional(),
  })
)

export const updateMemberRoleValidator = vine.create(
  vine.object({
    role: vine.enum(['admin', 'member', 'mechanic', 'boat_owner'] as const),
  })
)

export const acceptInvitationValidator = vine.create(
  vine.object({
    token: vine.string().trim(),
  })
)

export const declineInvitationValidator = vine.create(
  vine.object({
    token: vine.string().trim(),
  })
)
