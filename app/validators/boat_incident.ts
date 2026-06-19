import vine from '@vinejs/vine'

const incidentTypeChoices = [
  'grounding',
  'flooding',
  'rigging_failure',
  'engine_failure',
  'collision',
  'fire',
  'theft_vandalism',
  'other',
] as const

const incidentStatusChoices = ['open', 'in_progress', 'closed'] as const

export const createBoatIncidentValidator = vine.create(
  vine.object({
    occurredAt: vine.date(),
    // browser's getTimezoneOffset() — shifts the naive local datetime to UTC
    tzOffsetMinutes: vine.number().withoutDecimals().optional(),
    type: vine.enum(incidentTypeChoices),
    location: vine.string().trim().optional(),
    description: vine.string().trim().minLength(1),
    // unchecked checkboxes are not submitted — absent field → undefined; ?? false coerces to false
    insuranceClaimed: vine.boolean().optional(),
    insuranceClaimRef: vine.string().trim().optional(),
  })
)

export const updateBoatIncidentValidator = vine.create(
  vine.object({
    occurredAt: vine.date().optional(),
    // browser's getTimezoneOffset() — shifts the naive local datetime to UTC
    tzOffsetMinutes: vine.number().withoutDecimals().optional(),
    type: vine.enum(incidentTypeChoices).optional(),
    location: vine.string().trim().optional(),
    description: vine.string().trim().minLength(1).optional(),
    // unchecked checkboxes are not submitted — absent field → undefined; ?? false coerces to false
    insuranceClaimed: vine.boolean().optional(),
    insuranceClaimRef: vine.string().trim().optional(),
    status: vine.enum(incidentStatusChoices).optional(),
  })
)
