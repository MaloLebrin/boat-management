import { BaseModel, column } from '@adonisjs/lucid/orm'
import { DateTime } from 'luxon'
import type { SimulatorBoatInput, SimulatorCostBreakdown } from '#shared/types/simulator'

export default class SimulatorShare extends BaseModel {
  static table = 'simulator_shares'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare token: string

  @column({
    prepare: (v: SimulatorBoatInput) => JSON.stringify(v),
    consume: (v: string | SimulatorBoatInput) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare input: SimulatorBoatInput

  @column({
    prepare: (v: SimulatorCostBreakdown) => JSON.stringify(v),
    consume: (v: string | SimulatorCostBreakdown) => (typeof v === 'string' ? JSON.parse(v) : v),
  })
  declare breakdown: SimulatorCostBreakdown

  @column()
  declare locale: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
