import { OrganizationSchema } from '#database/schema'
import OrganizationAiKey from '#models/organization_ai_key'
import OrganizationModule from '#models/organization_module'
import Port from '#models/port'
import Subscription from '#models/subscription'
import { column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import type { PlanTier } from '#shared/types/plan'
import type { AiProvider } from '#shared/types/ai'
import type { FleetSize, OrganizationType } from '#shared/types/organization'

export default class Organization extends OrganizationSchema {
  @column()
  declare plan: PlanTier

  // Business profile declared at signup (#448) — narrowed from the generated
  // `string | null` columns.
  @column()
  declare type: OrganizationType | null

  @column()
  declare fleetSize: FleetSize | null

  // PostgreSQL returns bigInteger columns as strings; cast to number on read
  @column({ consume: (v: unknown) => Number(v) })
  declare storageUsedBytes: number

  // Fournisseur IA actif (BYOK) — null = clé Mistral de l'app + quota de
  // tokens. Les clés elles-mêmes vivent dans `organization_ai_keys`.
  declare aiProvider: AiProvider | null

  @hasMany(() => OrganizationAiKey)
  declare aiKeys: HasMany<typeof OrganizationAiKey>

  @hasMany(() => Port)
  declare ports: HasMany<typeof Port>

  @hasOne(() => Subscription)
  declare subscription: HasOne<typeof Subscription>

  @hasMany(() => OrganizationModule)
  declare modules: HasMany<typeof OrganizationModule>
}
