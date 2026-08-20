import type OrganizationModuleService from '#services/organization_module_service'
import type { ModuleSource, PlanAddon, PlanModule } from '#shared/types/plan'

/** Grants a boolean module via the service (source of truth for `organization_modules`). */
export async function ensureModule(
  moduleService: OrganizationModuleService,
  orgId: number,
  module: PlanModule,
  source: ModuleSource
): Promise<void> {
  await moduleService.grantModule(orgId, module, { source })
}

/** Sets a quantitative add-on via the service (source of truth for `organization_modules`). */
export async function ensureAddon(
  moduleService: OrganizationModuleService,
  orgId: number,
  addon: PlanAddon,
  quantity: number,
  source: ModuleSource
): Promise<void> {
  await moduleService.setAddonQuantity(orgId, addon, quantity, { source })
}
