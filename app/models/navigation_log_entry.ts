import NavigationLog from '#models/navigation_log'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class NavigationLogEntry extends BaseModel {
  static table = 'navigation_log_entries'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare navigationLogId: number

  @column()
  declare organizationId: number

  @column.dateTime()
  declare recordedAt: DateTime

  @column()
  declare latitude: string | null

  @column()
  declare longitude: string | null

  @column()
  declare gpsAccuracyM: string | null

  @column()
  declare cogDeg: number | null

  @column()
  declare sogKn: string | null

  @column()
  declare sailConfig: string | null

  @column()
  declare note: string | null

  // Réservés à l'itération météo (cache GRIB offline) — jamais écrits aujourd'hui.
  @column()
  declare twdDeg: number | null

  @column()
  declare twaDeg: number | null

  @column({
    prepare: (value: Record<string, unknown> | null) => (value ? JSON.stringify(value) : null),
  })
  declare weatherSnapshot: Record<string, unknown> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => NavigationLog)
  declare navigationLog: BelongsTo<typeof NavigationLog>
}
