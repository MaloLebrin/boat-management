import { OrganizationSchema } from '#database/schema'
import Port from '#models/port'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import type { PlanTier } from '#shared/types/plan'

export default class Organization extends OrganizationSchema {
  declare plan: PlanTier

  @hasMany(() => Port)
  declare ports: HasMany<typeof Port>
}
