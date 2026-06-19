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

function optionalBoolFromForm() {
  return vine
    .string()
    .optional()
    .transform((v) => v === 'on' || v === '1' || v === 'true')
}

export const createBoatIncidentValidator = vine.create(
  vine.object({
    occurredAt: vine.date(),
    type: vine.enum(incidentTypeChoices),
    location: vine.string().trim().optional(),
    description: vine.string().trim().minLength(1),
    insuranceClaimed: optionalBoolFromForm(),
    insuranceClaimRef: vine.string().trim().optional(),
  })
)

export const updateBoatIncidentValidator = vine.create(
  vine.object({
    occurredAt: vine.date(),
    type: vine.enum(incidentTypeChoices),
    location: vine.string().trim().optional(),
    description: vine.string().trim().minLength(1),
    insuranceClaimed: optionalBoolFromForm(),
    insuranceClaimRef: vine.string().trim().optional(),
    status: vine.enum(incidentStatusChoices),
  })
)
