import vine from '@vinejs/vine'
import { AI_MODEL_OVERRIDES } from '#shared/types/ai'

const email = () => vine.string().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(32)

export const loginValidator = vine.create({
  email: email(),
  password: vine.string().minLength(1).maxLength(255),
  remember: vine.boolean().optional(),
})

export const signupValidator = vine.create({
  fullName: vine
    .string()
    .trim()
    .maxLength(255)
    .nullable()
    .transform((v) => v || null),
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
  fullName: vine
    .string()
    .trim()
    .maxLength(255)
    .nullable()
    .transform((v) => v || null),
})

export const updateOrganizationValidator = vine.create({
  name: vine.string().minLength(1).maxLength(255),
})

export const updateAiSettingsValidator = vine.create({
  aiSystemPrompt: vine
    .string()
    .maxLength(2000)
    .nullable()
    .transform((v) => v || null),
  aiModelOverride: vine.enum(AI_MODEL_OVERRIDES).nullable().optional(),
})
