import { BoatMaintenanceSheetSchema } from '#database/schema'
import Boat from '#models/boat'
import BoatMaintenanceSheetItem from '#models/boat_maintenance_sheet_item'
import { belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

export default class BoatMaintenanceSheet extends BoatMaintenanceSheetSchema {
  static table = 'boat_maintenance_sheets'

  @belongsTo(() => Boat)
  declare boat: BelongsTo<typeof Boat>

  @hasMany(() => BoatMaintenanceSheetItem, { foreignKey: 'boatMaintenanceSheetId' })
  declare items: HasMany<typeof BoatMaintenanceSheetItem>
}
