import vine from '@vinejs/vine'

export const addRepairCartItemValidator = vine.create(
  vine.object({
    partKey: vine.string().trim().maxLength(64),
  })
)

export const updateRepairCartItemValidator = vine.create(
  vine.object({
    quantity: vine.number().withoutDecimals().min(1).max(99).optional(),
    reference: vine.string().trim().maxLength(64).nullable().optional(),
  })
)
