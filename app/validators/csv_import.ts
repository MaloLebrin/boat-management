import vine from '@vinejs/vine'

export const csvPreviewValidator = vine.create(
  vine.object({
    type: vine.enum(['maintenance'] as const),
    boatId: vine.number().positive(),
    file: vine.file({
      size: '5mb',
      extnames: ['csv'],
    }),
  })
)

export const csvConfirmValidator = vine.create(
  vine.object({
    type: vine.enum(['maintenance'] as const),
    boatId: vine.number().positive(),
  })
)
