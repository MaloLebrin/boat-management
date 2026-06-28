import vine from '@vinejs/vine'
import { RESERVATION_STATUSES } from '#shared/types/reservation'

export const createBoatReservationValidator = vine.compile(
  vine.object({
    startsAt: vine.date({ formats: ['YYYY-MM-DDTHH:mm', 'YYYY-MM-DD'] }),
    endsAt: vine.date({ formats: ['YYYY-MM-DDTHH:mm', 'YYYY-MM-DD'] }),
    clientName: vine.string().trim().minLength(1).maxLength(255),
    clientEmail: vine.string().trim().email().maxLength(255).optional().nullable(),
    clientPhone: vine.string().trim().maxLength(50).optional().nullable(),
    status: vine.enum(RESERVATION_STATUSES).optional(),
    notes: vine.string().trim().maxLength(2000).optional().nullable(),
    totalPrice: vine.number().positive().decimal([0, 2]).optional().nullable(),
  })
)

export const updateBoatReservationValidator = vine.compile(
  vine.object({
    startsAt: vine.date({ formats: ['YYYY-MM-DDTHH:mm', 'YYYY-MM-DD'] }).optional(),
    endsAt: vine.date({ formats: ['YYYY-MM-DDTHH:mm', 'YYYY-MM-DD'] }).optional(),
    clientName: vine.string().trim().minLength(1).maxLength(255).optional(),
    clientEmail: vine.string().trim().email().maxLength(255).optional().nullable(),
    clientPhone: vine.string().trim().maxLength(50).optional().nullable(),
    status: vine.enum(RESERVATION_STATUSES).optional(),
    notes: vine.string().trim().maxLength(2000).optional().nullable(),
    totalPrice: vine.number().positive().decimal([0, 2]).optional().nullable(),
  })
)
