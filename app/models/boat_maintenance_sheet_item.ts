import { BoatMaintenanceSheetItemSchema } from '#database/schema'
import BoatMaintenanceSheet from '#models/boat_maintenance_sheet'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BoatMaintenanceSheetItem extends BoatMaintenanceSheetItemSchema {
  static table = 'boat_maintenance_sheet_items'

  @belongsTo(() => BoatMaintenanceSheet, { foreignKey: 'boatMaintenanceSheetId' })
  declare sheet: BelongsTo<typeof BoatMaintenanceSheet>
}
