import Organization from '#models/organization'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import type { ClientStatus, ClientPermitType } from '#shared/types/client'

export default class Client extends BaseModel {
  static table = 'clients'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare email: string | null

  @column()
  declare phone: string | null

  @column()
  declare address: string | null

  @column()
  declare navigationPermitNumber: string | null

  @column()
  declare navigationPermitType: ClientPermitType | null

  @column()
  declare status: ClientStatus

  @column()
  declare notes: string | null

  @column.dateTime()
  declare gdprConsentAt: DateTime | null

  @column.dateTime()
  declare anonymizedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`
  }
}
