import { OrganizationSchema } from '#database/schema'
import Port from '#models/port'
import { hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'

export default class Organization extends OrganizationSchema {
  @hasMany(() => Port)
  declare ports: HasMany<typeof Port>
}
