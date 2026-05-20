import vine from '@vinejs/vine'

const subjectChoices = ['boat', 'hull', 'engine', 'sail', 'rig', 'electrical', 'plumbing', 'safety', 'deck', 'other'] as string[]

function optionalIdFromForm() {
  return vine
    .string()
    .trim()
    .optional()
    .transform((s) => {
      if (s === undefined || s === '') return null
      const n = Number.parseInt(s, 10)
      if (!Number.isInteger(n) || n < 1) return null
      return n
    })
}

function optionalNonNegativeIntFromForm() {
  return vine
    .string()
    .trim()
    .optional()
    .transform((s) => {
      if (s === undefined || s === '') return null
      const n = Number.parseInt(s, 10)
      if (!Number.isInteger(n) || n < 0) return null
      return n
    })
}

export const createBoatMaintenanceTaskValidator = vine.create(
  vine.object({
    subject: vine.string().in(subjectChoices),
    boatEngineId: optionalIdFromForm(),
    boatSailId: optionalIdFromForm(),
    boatRigId: optionalIdFromForm(),
    title: vine.string().trim().minLength(1),
    notes: vine.string().trim().optional(),

    dueAt: vine
      .date()
      .parse((v) => (v === '' || v === null || v === undefined ? null : v))
      .optional(),
    recurrenceIntervalMonths: optionalNonNegativeIntFromForm(),

    dueEngineHours: optionalNonNegativeIntFromForm(),
    recurrenceIntervalEngineHours: optionalNonNegativeIntFromForm(),
  })
)

export const markBoatMaintenanceTaskDoneValidator = vine.create(
  vine.object({
    doneAt: vine
      .date()
      .parse((v) => (v === '' || v === null || v === undefined ? null : v))
      .optional(),
    doneEngineHours: optionalNonNegativeIntFromForm(),
  })
)
