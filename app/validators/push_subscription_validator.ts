import vine from '@vinejs/vine'

/**
 * Corps du POST /push/subscriptions — le `PushSubscription.toJSON()` du
 * navigateur (#497). L'endpoint est une URL du push service (FCM, APNs, Mozilla
 * autopush…), les clés sont du base64url opaque.
 */
export const subscribePushValidator = vine.create(
  vine.object({
    endpoint: vine
      .string()
      .trim()
      .url({ protocols: ['https'] })
      .maxLength(2048),
    keys: vine.object({
      p256dh: vine.string().trim().minLength(1).maxLength(255),
      auth: vine.string().trim().minLength(1).maxLength(255),
    }),
  })
)

export const unsubscribePushValidator = vine.create(
  vine.object({
    endpoint: vine
      .string()
      .trim()
      .url({ protocols: ['https'] })
      .maxLength(2048),
  })
)
