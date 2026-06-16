import vine from '@vinejs/vine'

const email = () => vine.string().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(32)

export const loginValidator = vine.create({
  email: email(),
  password: vine.string().minLength(1).maxLength(255),
  remember: vine.boolean().optional(),
})

export const signupValidator = vine.create({
  fullName: vine.string().maxLength(255).nullable(),
  email: email().unique({ table: 'users', column: 'email' }),
  password: password().confirmed({
    confirmationField: 'passwordConfirmation',
  }),
})

export const forgotPasswordValidator = vine.create({
  email: email(),
})

export const resetPasswordValidator = vine.create({
  token: vine.string().minLength(64),
  password: password().confirmed({ confirmationField: 'passwordConfirmation' }),
})

export const updateProfileValidator = vine.create({
  fullName: vine.string().maxLength(255).nullable(),
})

export const updateOrganizationValidator = vine.create({
  name: vine.string().minLength(1).maxLength(255),
})

export const AI_MODEL_OVERRIDES = [
  'mistral-small-latest',
  'mistral-medium-latest',
  'mistral-large-latest',
] as const
export type AiModelOverride = (typeof AI_MODEL_OVERRIDES)[number]

export const updateAiSettingsValidator = vine.create({
  aiSystemPrompt: vine
    .string()
    .maxLength(2000)
    .nullable()
    .transform((v) => v || null),
  aiModelOverride: vine.enum(AI_MODEL_OVERRIDES).nullable().optional(),
})
