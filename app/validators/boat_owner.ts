import vine from '@vinejs/vine'

export const attachBoatOwnerValidator = vine.create({
  userId: vine.number().positive(),
})
