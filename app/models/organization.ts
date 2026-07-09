import { OrganizationSchema } from '#database/schema'
import OrganizationModule from '#models/organization_module'
import Port from '#models/port'
import Subscription from '#models/subscription'
import { column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import type { PlanTier } from '#shared/types/plan'

export default class Organization extends OrganizationSchema {
  @column()
  declare plan: PlanTier

  // PostgreSQL returns bigInteger columns as strings; cast to number on read
  @column({ consume: (v: unknown) => Number(v) })
  declare storageUsedBytes: number

  @hasMany(() => Port)
  declare ports: HasMany<typeof Port>

  @hasOne(() => Subscription)
  declare subscription: HasOne<typeof Subscription>

  @hasMany(() => OrganizationModule)
  declare modules: HasMany<typeof OrganizationModule>
}
