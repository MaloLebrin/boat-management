import { OrganizationSchema } from '#database/schema'
import Port from '#models/port'
import Subscription from '#models/subscription'
import { hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import type { PlanTier } from '#shared/types/plan'

export default class Organization extends OrganizationSchema {
  declare plan: PlanTier

  @hasMany(() => Port)
  declare ports: HasMany<typeof Port>

  @hasOne(() => Subscription)
  declare subscription: HasOne<typeof Subscription>
}
