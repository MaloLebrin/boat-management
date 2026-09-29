import { CalendarFeedSchema } from '#database/schema'
import Boat from '#models/boat'
import Organization from '#models/organization'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Flux `.ics` publié par jeton (#880) : un bateau (`boatId`) ou toute la flotte
 * (`boatId` nul). Le jeton est le seul secret de l'URL — supprimer la ligne
 * révoque le flux.
 */
export default class CalendarFeed extends CalendarFeedSchema {
  static table = 'calendar_feeds'

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>
}
