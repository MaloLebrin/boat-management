import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import InventoryItem from '#models/inventory_item'

/** Ligne d'un bon de commande (#892) : un article, une quantité, un prix unitaire HT. */
export default class PurchaseOrderLine extends BaseModel {
  static table = 'purchase_order_lines'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare purchaseOrderId: number

  @column()
  declare inventoryItemId: number

  @column({ consume: (value: unknown) => Number(value) })
  declare quantity: number

  @column({ consume: (value: unknown) => Number(value) })
  declare unitCost: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => InventoryItem)
  declare item: BelongsTo<typeof InventoryItem>
}
