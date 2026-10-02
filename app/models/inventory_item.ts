import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import Supplier from '#models/supplier'
import type { InventoryUnit } from '#shared/types/inventory'

const toNumber = (value: unknown) => Number(value)
const toNumberOrNull = (value: unknown) => (value === null ? null : Number(value))

/**
 * Article du stock central de l'organisation (#892). `quantity` est tenue à
 * jour par `InventoryService.recordMovement` — jamais écrite directement.
 */
export default class InventoryItem extends BaseModel {
  static table = 'inventory_items'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number

  @column()
  declare name: string

  @column()
  declare reference: string | null

  @column()
  declare unit: InventoryUnit

  @column({ consume: toNumber })
  declare quantity: number

  @column({ consume: toNumberOrNull })
  declare minQuantity: number | null

  @column()
  declare location: string | null

  @column({ consume: toNumberOrNull })
  declare averageCost: number | null

  @column()
  declare supplierId: number | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Supplier)
  declare supplier: BelongsTo<typeof Supplier>
}
