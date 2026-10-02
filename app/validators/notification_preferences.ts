import vine from '@vinejs/vine'

const channels = vine.object({
  inApp: vine.boolean(),
  push: vine.boolean(),
  email: vine.boolean(),
})

/** Matrice familles × canaux de `/settings/notifications` (#888). */
export const updateNotificationPreferencesValidator = vine.create({
  families: vine.object({
    fleet: channels.clone(),
    rental: channels.clone(),
    billing: channels.clone(),
    team: channels.clone(),
    ai: channels.clone(),
  }),
  quietHours: vine.boolean(),
  emailDigest: vine.boolean(),
  timezone: vine.string().trim().minLength(1).maxLength(64),
})
