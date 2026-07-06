import vine from '@vinejs/vine'

export const storeSignedRentalContractValidator = vine.create(
  vine.object({
    file: vine.file({
      size: '20mb',
      extnames: ['pdf'],
    }),
  })
)
