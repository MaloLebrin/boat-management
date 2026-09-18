import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type { BoatPositionHistoryKind } from '#shared/types/boat'
import Boat from '#models/boat'
import Spot from '#models/spot'

export default class BoatPositionHistory extends BaseModel {
  static table = 'boat_position_history'

  /**
   * Clôt les lignes ouvertes du bateau **de cette seule nature** (#722).
   *
   * Séjours à quai et points de position partagent la table et la convention
   * `endedAt === null`. Tant que la clôture s'écrivait à la main de chaque côté,
   * elle balayait tout : un point GPS fermait le séjour en cours, amarrer
   * fermait le dernier point. Le geste vit ici, une seule fois, et il porte
   * toujours son `kind`.
   */
  static async closeOpenOfKind(
    boatId: number,
    kind: BoatPositionHistoryKind,
    trx?: TransactionClientContract
  ) {
    await this.query({ client: trx })
      .where('boatId', boatId)
      .where('kind', kind)
      .whereNull('endedAt')
      .update({ endedAt: DateTime.now().toSQL() })
  }

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare boatId: number

  @column()
  declare kind: BoatPositionHistoryKind

  @column()
  declare spotId: number | null

  @column()
  declare latitude: number | null

  @column()
  declare longitude: number | null

  @column()
  declare speedKnots: number | null

  @column()
  declare headingDegrees: number | null

  @column()
  declare source: 'manual' | 'ais' | 'gps'

  @column.dateTime()
  declare startedAt: DateTime

  @column.dateTime()
  declare endedAt: DateTime | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @belongsTo(() => Spot)
  declare spot: BelongsTo<typeof Spot>
}
