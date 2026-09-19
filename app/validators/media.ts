import vine from '@vinejs/vine'
import {
  DOCUMENT_EXTNAMES,
  DOCUMENT_MAX_SIZE_MB,
  MAX_FILES_PER_BATCH,
  PHOTO_EXTNAMES,
  PHOTO_MAX_SIZE_MB,
} from '#shared/constants/media'

/**
 * Les bornes viennent de `shared/constants/media.ts` (#764) : le middleware
 * qui écrit les parties sur disque lit les mêmes, et refuse donc une extension
 * ou un fichier surnuméraire **avant** de payer l'écriture.
 */
export const storeBoatPhotosValidator = vine.create(
  vine.object({
    files: vine
      .array(
        vine.file({
          size: `${PHOTO_MAX_SIZE_MB}mb`,
          extnames: [...PHOTO_EXTNAMES],
        })
      )
      .minLength(1)
      .maxLength(MAX_FILES_PER_BATCH),
    caption: vine.string().trim().maxLength(255).nullable().optional(),
  })
)

export const storeBoatDocumentsValidator = vine.create(
  vine.object({
    files: vine
      .array(
        vine.file({
          size: `${DOCUMENT_MAX_SIZE_MB}mb`,
          extnames: [...DOCUMENT_EXTNAMES],
        })
      )
      .minLength(1)
      .maxLength(MAX_FILES_PER_BATCH),
    caption: vine.string().trim().maxLength(255).nullable().optional(),
  })
)
