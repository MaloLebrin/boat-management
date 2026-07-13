import { OrganizationModuleSchema } from '#database/schema'
import Organization from '#models/organization'
import type { ModuleSource, PlanAddon, PlanModule } from '#shared/types/plan'
import { belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class OrganizationModule extends OrganizationModuleSchema {
  // La colonne `module` porte soit un module booléen (`PlanModule`), soit un
  // add-on quantitatif (`PlanAddon`, ex. `extra_boats`). `quantity` n'est
  // signifiant que pour les add-ons (toujours 1 pour un module).
  declare module: PlanModule | PlanAddon
  declare source: ModuleSource

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
