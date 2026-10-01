import vine from '@vinejs/vine'

/** Alerte e-mail « nouvel appareil » (#885). */
export const newLoginNotificationValidator = vine.create({
  enabled: vine.boolean(),
})
