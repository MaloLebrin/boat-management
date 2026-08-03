import vine from '@vinejs/vine'
import { AI_MODEL_OVERRIDES } from '#shared/types/ai'
import { FLEET_SIZES, ORGANIZATION_TYPES } from '#shared/types/organization'
import { THEME_PREFERENCES } from '#shared/types/theme'

const email = () => vine.string().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(32)

export const loginValidator = vine.create({
  email: email(),
  password: vine.string().minLength(1).maxLength(255),
  remember: vine.boolean().optional(),
})

/**
 * Mirrors exactly the fields rendered by `inertia/pages/auth/signup.vue` (#448).
 * Any field added here must be rendered by that form, otherwise its errors are
 * invisible to the user and the signup fails silently.
 *
 * The form has no password confirmation input (it ships a show/hide toggle
 * instead), so `confirmed()` is deliberately absent.
 */
export const signupValidator = vine.create({
  firstName: vine.string().trim().minLength(1).maxLength(100),
  lastName: vine.string().trim().minLength(1).maxLength(100),
  email: email().unique({ table: 'users', column: 'email' }),
  password: password(),
  organizationName: vine.string().trim().minLength(2).maxLength(255),
  organizationType: vine.enum(ORGANIZATION_TYPES).nullable().optional(),
  fleetSize: vine.enum(FLEET_SIZES).nullable().optional(),
  acceptTerms: vine.accepted(),
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

export const changePasswordValidator = vine.create({
  currentPassword: vine.string().minLength(1).maxLength(255),
  password: password().confirmed({ confirmationField: 'passwordConfirmation' }),
})

export const updateLocaleValidator = vine.create({
  locale: vine.enum(['en', 'fr'] as const),
})

export const updateThemeValidator = vine.create({
  theme: vine.enum(THEME_PREFERENCES),
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
