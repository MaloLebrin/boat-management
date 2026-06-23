import CrewCertification from '#models/crew_certification'
import NavigationLog from '#models/navigation_log'
import { BaseModel, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class CrewMember extends BaseModel {
  static table = 'crew_members'

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare organizationId: number

  @column()
  declare firstName: string

  @column()
  declare lastName: string

  @column()
  declare email: string | null

  @column()
  declare phone: string | null

  @column()
  declare notes: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => CrewCertification)
  declare certifications: HasMany<typeof CrewCertification>

  @manyToMany(() => NavigationLog, {
    pivotTable: 'navigation_log_crew',
    pivotColumns: ['role'],
  })
  declare navigationLogs: ManyToMany<typeof NavigationLog>

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`
  }
}
