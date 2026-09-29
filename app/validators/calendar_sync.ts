import vine from '@vinejs/vine'

/** Synchronisation iCal des réservations (#880). */

export const calendarFeedValidator = vine.create(
  vine.object({
    includeClientName: vine.boolean().optional(),
    includeMaintenance: vine.boolean().optional(),
  })
)

export const addExternalCalendarValidator = vine.create(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100),
    // Le contrôle SSRF (https, port, adresse) est fait par le service, qui
    // accepte aussi `webcal://`.
    url: vine.string().trim().minLength(1).maxLength(2000),
  })
)
