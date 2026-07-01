import vine from '@vinejs/vine'
import { BUDGET_ENTRY_CATEGORIES } from '#shared/types/budget'

export type { BudgetEntryCategory } from '#shared/types/budget'

export const budgetEntryValidator = vine.create(
  vine.object({
    amount: vine.number().decimal([0, 2]),
    date: vine.date({ formats: ['YYYY-MM-DD'] }),
    label: vine.string().trim().minLength(1).maxLength(255),
    category: vine.enum(BUDGET_ENTRY_CATEGORIES).optional(),
    description: vine.string().trim().maxLength(2000).optional(),
  })
)
