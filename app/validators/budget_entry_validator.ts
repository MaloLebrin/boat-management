import vine from '@vinejs/vine'

export const BUDGET_ENTRY_CATEGORIES = [
  'maintenance',
  'fuel',
  'documents',
  'port',
  'equipment',
  'other',
] as const
export type BudgetEntryCategory = (typeof BUDGET_ENTRY_CATEGORIES)[number]

export const budgetEntryValidator = vine.create(
  vine.object({
    amount: vine.number().positive().decimal([0, 2]),
    date: vine.date({ formats: ['YYYY-MM-DD'] }),
    label: vine.string().trim().minLength(1).maxLength(255),
    category: vine.enum(BUDGET_ENTRY_CATEGORIES).optional(),
    description: vine.string().trim().maxLength(2000).optional(),
  })
)
