import { BoatMaintenancePartSchema } from '#database/schema'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BoatMaintenancePart extends BoatMaintenancePartSchema {
  @belongsTo(() => BoatMaintenanceEvent, { foreignKey: 'maintenanceEventId' })
  declare maintenanceEvent: BelongsTo<typeof BoatMaintenanceEvent>
}
