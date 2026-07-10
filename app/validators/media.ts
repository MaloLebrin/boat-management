import vine from '@vinejs/vine'

export const storeBoatPhotosValidator = vine.create(
  vine.object({
    files: vine
      .array(
        vine.file({
          size: '10mb',
          extnames: ['jpg', 'jpeg', 'png', 'heic', 'webp', 'gif'],
        })
      )
      .minLength(1)
      .maxLength(20),
    caption: vine.string().trim().maxLength(255).nullable().optional(),
  })
)

export const storeBoatDocumentsValidator = vine.create(
  vine.object({
    files: vine
      .array(
        vine.file({
          size: '20mb',
          extnames: ['pdf', 'csv', 'xlsx', 'docx', 'doc'],
        })
      )
      .minLength(1)
      .maxLength(20),
    caption: vine.string().trim().maxLength(255).nullable().optional(),
  })
)
