import { OrganizationModuleSchema } from '#database/schema'
import Organization from '#models/organization'
import type { ModuleSource, PlanAddon, PlanModule } from '#shared/types/plan'
import { afterDelete, afterSave, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class OrganizationModule extends OrganizationModuleSchema {
  /**
   * Compteur incrémenté à chaque écriture d'une ligne : le cache par instance
   * d'organisation de `OrganizationModuleService` s'en sert pour se périmer.
   * Les hooks ne voient pas les écritures en masse (`query().delete()`) — le
   * service, seul à en faire, appelle `invalidate()` lui-même.
   */
  static generation = 0

  static invalidate(): void {
    OrganizationModule.generation++
  }

  @afterSave()
  static invalidateAfterSave() {
    OrganizationModule.invalidate()
  }

  @afterDelete()
  static invalidateAfterDelete() {
    OrganizationModule.invalidate()
  }

  // La colonne `module` porte soit un module booléen (`PlanModule`), soit un
  // add-on quantitatif (`PlanAddon`, ex. `extra_boats`). `quantity` n'est
  // signifiant que pour les add-ons (toujours 1 pour un module).
  declare module: PlanModule | PlanAddon
  declare source: ModuleSource

  @belongsTo(() => Organization)
  declare organization: BelongsTo<typeof Organization>
}
