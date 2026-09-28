import vine from '@vinejs/vine'
import { BOAT_STATUSES } from '#shared/types/boat_status'

export const changeBoatStatusValidator = vine.compile(
  vine.object({
    status: vine.enum(BOAT_STATUSES),
    reason: vine.string().trim().maxLength(1000).optional().nullable(),
  })
)
