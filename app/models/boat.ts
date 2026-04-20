import { BoatSchema } from '#database/schema'
import Organization from '#models/organization'
import BoatEngine from '#models/boat_engine'
import BoatRig from '#models/boat_rig'
import BoatSail from '#models/boat_sail'
import { belongsTo, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'

export default class Boat extends BoatSchema {
  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @hasMany(() => BoatEngine)
  declare engines: HasMany<typeof BoatEngine>

  @hasMany(() => BoatSail)
  declare sails: HasMany<typeof BoatSail>

  @hasOne(() => BoatRig)
  declare rig: HasOne<typeof BoatRig>
}
