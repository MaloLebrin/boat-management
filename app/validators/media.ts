import vine from '@vinejs/vine'

export const storeBoatPhotoValidator = vine.create(
  vine.object({
    file: vine.file({
      size: '10mb',
      extnames: ['jpg', 'jpeg', 'png', 'heic', 'webp', 'gif'],
    }),
    caption: vine.string().trim().maxLength(255).nullable().optional(),
  })
)

export const storeBoatDocumentValidator = vine.create(
  vine.object({
    file: vine.file({
      size: '20mb',
      extnames: ['pdf', 'csv', 'xlsx', 'docx', 'doc'],
    }),
    caption: vine.string().trim().maxLength(255).nullable().optional(),
  })
)
