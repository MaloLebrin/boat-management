import { ExternalCalendarSchema } from '#database/schema'
import Boat from '#models/boat'
import ExternalCalendarEvent from '#models/external_calendar_event'
import type { ExternalCalendarError } from '#shared/types/calendar_sync'
import { belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

/** Flux `.ics` d'une plateforme externe importé sur un bateau (#880). */
export default class ExternalCalendar extends ExternalCalendarSchema {
  static table = 'external_calendars'

  @column()
  declare lastError: ExternalCalendarError | null

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @hasMany(() => ExternalCalendarEvent)
  declare events: HasMany<typeof ExternalCalendarEvent>
}
