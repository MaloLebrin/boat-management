import vine from '@vinejs/vine'

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/

export const updateBrandingValidator = vine.create(
  vine.object({
    primaryColor: vine.string().regex(HEX_COLOR_REGEX).nullable().optional(),
    secondaryColor: vine.string().regex(HEX_COLOR_REGEX).nullable().optional(),
    appName: vine.string().trim().maxLength(100).nullable().optional(),
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
