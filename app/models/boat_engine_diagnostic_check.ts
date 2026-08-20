import { BoatEngineDiagnosticCheckSchema } from '#database/schema'
import BoatEngine from '#models/boat_engine'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class BoatEngineDiagnosticCheck extends BoatEngineDiagnosticCheckSchema {
  static table = 'boat_engine_diagnostic_checks'

  @belongsTo(() => BoatEngine, { foreignKey: 'boatEngineId' })
  declare engine: BelongsTo<typeof BoatEngine>
}
