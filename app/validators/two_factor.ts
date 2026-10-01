import vine from '@vinejs/vine'
import { TWO_FACTOR_MAX_GRACE_DAYS } from '#shared/constants/two_factor'

/** Code TOTP (6 chiffres) ou code de secours (`xxxxx-xxxxx`) — #884. */
const code = () => vine.string().trim().minLength(6).maxLength(32)

export const twoFactorCodeValidator = vine.create({
  code: code(),
})

export const disableTwoFactorValidator = vine.create({
  password: vine.string().minLength(1).maxLength(255),
  code: code(),
})

export const organizationTwoFactorPolicyValidator = vine.create({
  requireTwoFactor: vine.boolean().optional(),
  graceDays: vine.number().withoutDecimals().min(0).max(TWO_FACTOR_MAX_GRACE_DAYS).optional(),
})
