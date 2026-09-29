import { ExternalCalendarEventSchema } from '#database/schema'
import ExternalCalendar from '#models/external_calendar'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Créneau importé d'un calendrier externe (#880) : bloque les dates du bateau
 * sans être une réservation (ni chiffre d'affaires, ni facturation, ni export).
 */
export default class ExternalCalendarEvent extends ExternalCalendarEventSchema {
  static table = 'external_calendar_events'

  @belongsTo(() => ExternalCalendar)
  declare calendar: BelongsTo<typeof ExternalCalendar>
}
