import vine from '@vinejs/vine'

export const budgetYearValidator = vine.create(
  vine.object({
    year: vine.number().withoutDecimals().min(2000).max(2100).optional(),
  })
)
