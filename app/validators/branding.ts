import vine from '@vinejs/vine'

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/

export const updateBrandingValidator = vine.create(
  vine.object({
    primaryColor: vine
      .string()
      .regex(HEX_COLOR_REGEX)
      .nullable()
      .optional()
      .transform((v) => v || null),
    secondaryColor: vine
      .string()
      .regex(HEX_COLOR_REGEX)
      .nullable()
      .optional()
      .transform((v) => v || null),
    appName: vine
      .string()
      .trim()
      .minLength(1)
      .maxLength(100)
      .nullable()
      .optional()
      .transform((v) => v || null),
  })
)

export const uploadLogoValidator = vine.create(
  vine.object({
    logo: vine.file({
      size: '2mb',
      extnames: ['jpg', 'jpeg', 'png', 'svg', 'webp'],
    }),
  })
)
