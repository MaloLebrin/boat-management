import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'

export default class SimulatorLead extends BaseModel {
  static table = 'simulator_leads'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare email: string

  @column()
  declare boatType: string

  @column()
  declare lengthM: number

  @column()
  declare hullWear: string | null

  @column()
  declare engineWear: string | null

  @column()
  declare safetyWear: string | null

  @column()
  declare riggingWear: string | null

  @column()
  declare totalMin: number

  @column()
  declare totalMax: number

  @column()
  declare locale: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
