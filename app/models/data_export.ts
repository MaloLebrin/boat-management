import { DataExportSchema } from '#database/schema'
import Organization from '#models/organization'
import User from '#models/user'
import type { DataExportStatus, FleetExportParams, FleetExportType } from '#shared/types/export'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

/**
 * Export généré en arrière-plan (#879). Le fichier vit dans `content` jusqu'à
 * `expires_at` — **ne jamais** le charger dans une liste : sélectionner les
 * colonnes explicitement (`DataExportService.LIST_COLUMNS`).
 */
export default class DataExport extends DataExportSchema {
  static table = 'data_exports'

  @column()
  declare type: FleetExportType

  @column()
  declare status: DataExportStatus

  @column({
    prepare: (v: FleetExportParams) => JSON.stringify(v),
    consume: (v: string | FleetExportParams) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare params: FleetExportParams

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
