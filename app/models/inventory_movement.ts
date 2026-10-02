import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import InventoryItem from '#models/inventory_item'
import PurchaseOrder from '#models/purchase_order'
import User from '#models/user'
import type { InventoryMovementReason } from '#shared/types/inventory'

/** Une entrée (+) ou sortie (−) du stock d'un article (#892). */
export default class InventoryMovement extends BaseModel {
  static table = 'inventory_movements'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number

  @column()
  declare inventoryItemId: number

  @column({ consume: (value: unknown) => Number(value) })
  declare quantity: number

  @column()
  declare reason: InventoryMovementReason

  @column({ consume: (value: unknown) => (value === null ? null : Number(value)) })
  declare unitCost: number | null

  @column()
  declare maintenanceEventId: number | null

  @column()
  declare purchaseOrderId: number | null

  @column()
  declare userId: number | null

  @column()
  declare note: string | null

  @column.dateTime()
  declare occurredAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => InventoryItem)
  declare item: BelongsTo<typeof InventoryItem>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => PurchaseOrder)
  declare purchaseOrder: BelongsTo<typeof PurchaseOrder>
}
