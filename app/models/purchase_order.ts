import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import type { DateTime } from 'luxon'
import Boat from '#models/boat'
import PurchaseOrderLine from '#models/purchase_order_line'
import Supplier from '#models/supplier'
import type { PurchaseOrderStatus } from '#shared/types/inventory'

/**
 * Bon de commande fournisseur (#892) : `draft` → `sent` → `received` (ou
 * `cancelled`). `number` est séquentiel par organisation.
 */
export default class PurchaseOrder extends BaseModel {
  static table = 'purchase_orders'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number

  @column()
  declare number: number

  @column()
  declare supplierId: number

  @column()
  declare boatId: number | null

  @column()
  declare status: PurchaseOrderStatus

  @column.date()
  declare orderedOn: DateTime | null

  @column.dateTime()
  declare receivedAt: DateTime | null

  @column()
  declare budgetEntryId: number | null

  @column()
  declare createdBy: number | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Supplier)
  declare supplier: BelongsTo<typeof Supplier>

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @hasMany(() => PurchaseOrderLine)
  declare lines: HasMany<typeof PurchaseOrderLine>
}
