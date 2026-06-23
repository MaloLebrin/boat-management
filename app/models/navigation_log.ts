import Boat from '#models/boat'
import CrewMember from '#models/crew_member'
import Port from '#models/port'
import { BaseModel, belongsTo, column, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import type { NavigationLogStatus, SeaState } from '#shared/types/navigation_log'

export default class NavigationLog extends BaseModel {
  static table = 'navigation_logs'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare boatId: number

  @column()
  declare organizationId: number

  @column()
  declare status: NavigationLogStatus

  @column.dateTime()
  declare departedAt: DateTime

  @column.dateTime()
  declare arrivedAt: DateTime | null

  @column()
  declare departurePortId: number | null

  @column()
  declare departurePortName: string | null

  @column()
  declare arrivalPortId: number | null

  @column()
  declare arrivalPortName: string | null

  @column()
  declare distanceNm: string | null

  @column()
  declare engineHoursStart: string | null

  @column()
  declare engineHoursEnd: string | null

  @column()
  declare fuelConsumedLiters: string | null

  @column()
  declare windForceBeaufort: number | null

  @column()
  declare seaState: SeaState | null

  @column()
  declare crewCount: number | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @belongsTo(() => Port, { foreignKey: 'departurePortId' })
  declare departurePort: BelongsTo<typeof Port>

  @belongsTo(() => Port, { foreignKey: 'arrivalPortId' })
  declare arrivalPort: BelongsTo<typeof Port>

  @manyToMany(() => CrewMember, {
    pivotTable: 'navigation_log_crew',
    pivotColumns: ['role'],
  })
  declare crew: ManyToMany<typeof CrewMember>
}
