import Organization from '#models/organization'
import BoatDocument from '#models/boat_document'
import BoatEngine from '#models/boat_engine'
import BoatMaintenanceEvent from '#models/boat_maintenance_event'
import BoatPositionHistory from '#models/boat_position_history'
import BoatRig from '#models/boat_rig'
import BoatSail from '#models/boat_sail'
import BoatSafetyEquipment from '#models/boat_safety_equipment'
import Spot from '#models/spot'
import { BaseModel, belongsTo, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class Boat extends BaseModel {
  static table = 'boats'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number

  @column()
  declare name: string

  @column()
  declare registrationNumber: string | null

  @column()
  declare type: string | null

  @column()
  declare propulsionType: string | null

  @column()
  declare lengthM: number | null

  @column()
  declare beamM: number | null

  @column()
  declare draftM: number | null

  @column()
  declare mastHeightM: number | null

  @column()
  declare hullMaterial: string | null

  @column()
  declare yearBuilt: number | null

  @column()
  declare manufacturer: string | null

  @column()
  declare model: string | null

  @column.date()
  declare manufacturedAt: DateTime | null

  @column()
  declare homePort: string | null

  @column()
  declare navigationCategory: string | null

  @column()
  declare hullIdentificationNumber: string | null

  @column()
  declare francisationNumber: string | null

  @column()
  declare flagCountry: string | null

  @column()
  declare maxPersons: number | null

  @column()
  declare spotId: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @hasMany(() => BoatEngine)
  declare engines: HasMany<typeof BoatEngine>

  @hasMany(() => BoatSail)
  declare sails: HasMany<typeof BoatSail>

  @hasOne(() => BoatRig)
  declare rig: HasOne<typeof BoatRig>

  @hasMany(() => BoatMaintenanceEvent)
  declare maintenanceEvents: HasMany<typeof BoatMaintenanceEvent>

  @hasMany(() => BoatSafetyEquipment)
  declare safetyEquipment: HasMany<typeof BoatSafetyEquipment>

  @belongsTo(() => Spot)
  declare spot: BelongsTo<typeof Spot>

  @hasMany(() => BoatPositionHistory)
  declare positionHistory: HasMany<typeof BoatPositionHistory>

  @hasMany(() => BoatDocument)
  declare documents: HasMany<typeof BoatDocument>
}
