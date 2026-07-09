import { OrganizationModuleSchema } from '#database/schema'
import Organization from '#models/organization'
import type { ModuleSource, PlanModule } from '#shared/types/plan'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class OrganizationModule extends OrganizationModuleSchema {
  declare module: PlanModule
  declare source: ModuleSource

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
