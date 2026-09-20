import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Boat from '#models/boat'
import User from '#models/user'
import type { CsvImportType, MaintenanceImportRow } from '#shared/types/csv'

/**
 * Import CSV en attente de confirmation (#774).
 *
 * Remplace le transit des lignes par la session, qui ne tenait pas dans un
 * cookie dès quelques centaines de lignes. Une ligne au plus par utilisateur.
 */
export default class PendingImport extends BaseModel {
  static table = 'pending_imports'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare boatId: number

  @column()
  declare type: CsvImportType

  @column({
    prepare: (value: MaintenanceImportRow[]) => JSON.stringify(value),
  })
  declare rows: MaintenanceImportRow[]

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>
}
