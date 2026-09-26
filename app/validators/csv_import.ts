import vine from '@vinejs/vine'
import { CSV_IMPORT_EXTNAMES, CSV_IMPORT_MAX_FILE_SIZE_MB } from '#shared/constants/csv_import'
import { CSV_IMPORT_TYPES } from '#shared/types/csv'

export const csvPreviewValidator = vine.create(
  vine.object({
    type: vine.enum(CSV_IMPORT_TYPES),
    boatId: vine.number().positive(),
    /**
     * Taille calée sur le plafond de lignes (#774). Le `5mb` précédent était
     * un piège : il acceptait plusieurs dizaines de milliers de lignes que le
     * reste de la chaîne ne pouvait pas traiter. Le même plafond vaut pour un
     * classeur `.xlsx`, lu en entier en mémoire.
     */
    file: vine.file({
      size: `${CSV_IMPORT_MAX_FILE_SIZE_MB}mb`,
      extnames: [...CSV_IMPORT_EXTNAMES],
    }),
  })
)

export const csvConfirmValidator = vine.create(
  vine.object({
    type: vine.enum(CSV_IMPORT_TYPES),
    boatId: vine.number().positive(),
  })
)
