import vine from '@vinejs/vine'
import { CSV_IMPORT_MAX_FILE_SIZE_MB } from '#shared/constants/csv_import'

export const csvPreviewValidator = vine.create(
  vine.object({
    type: vine.enum(['maintenance'] as const),
    boatId: vine.number().positive(),
    /**
     * Taille calée sur le plafond de lignes (#774). Le `5mb` précédent était
     * un piège : il acceptait plusieurs dizaines de milliers de lignes que le
     * reste de la chaîne ne pouvait pas traiter.
     */
    file: vine.file({
      size: `${CSV_IMPORT_MAX_FILE_SIZE_MB}mb`,
      extnames: ['csv'],
    }),
  })
)

export const csvConfirmValidator = vine.create(
  vine.object({
    type: vine.enum(['maintenance'] as const),
    boatId: vine.number().positive(),
  })
)
