import { BoatEnginePartSchema } from '#database/schema'
import BoatEngine from '#models/boat_engine'
import InventoryItem from '#models/inventory_item'
import { belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BoatEnginePart extends BoatEnginePartSchema {
  /**
   * Article du stock central (#892). Relié, la pièce lit sa quantité dans
   * l'inventaire ; son `stock` local est conservé tel quel et redevient la
   * référence si on la délie.
   */
  @column()
  declare inventoryItemId: number | null

  @belongsTo(() => BoatEngine, { foreignKey: 'boatEngineId' })
  declare engine: BelongsTo<typeof BoatEngine>

  @belongsTo(() => InventoryItem)
  declare inventoryItem: BelongsTo<typeof InventoryItem>
}
