import vine from '@vinejs/vine'

export const boatPortStayValidator = vine.create(
  vine.object({
    portName: vine.string().trim().maxLength(255),
    startedAt: vine.date({ formats: ['YYYY-MM-DD'] }),
    endedAt: vine
      .date({ formats: ['YYYY-MM-DD'] })
      .afterOrSameAs('startedAt')
      .optional(),
    cost: vine.number().min(0).optional(),
    notes: vine.string().trim().maxLength(2000).optional(),
  })
)
