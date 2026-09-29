import vine from '@vinejs/vine'

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/

export const updateBrandingValidator = vine.create(
  vine.object({
    primaryColor: vine.string().regex(HEX_COLOR_REGEX).nullable().optional(),
    secondaryColor: vine.string().regex(HEX_COLOR_REGEX).nullable().optional(),
    appName: vine.string().trim().maxLength(100).nullable().optional(),
  })
)

/**
 * Bitmap uniquement — pas de SVG (#785).
 *
 * Un SVG est un document XML actif (script, on*, foreignObject, refs externes).
 * Le logo de marque n'est jamais inliné : UI et e-mails en `<img>`, PDF via
 * PDFKit `doc.image` (raster). Ne pas réintroduire `svg`, ni le rendre via
 * `v-html` / proxy même origine, sans assainisseur.
 */
export const uploadLogoValidator = vine.create(
  vine.object({
    logo: vine.file({
      size: '2mb',
      extnames: ['jpg', 'jpeg', 'png', 'webp'],
    }),
  })
)
