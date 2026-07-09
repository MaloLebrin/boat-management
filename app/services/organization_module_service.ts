import OrganizationModule from '#models/organization_module'
import type Organization from '#models/organization'
import { resolveEffectiveQuotas } from '#shared/helpers/plan'
import type { ModuleSource, PlanModule, PlanQuotas } from '#shared/types/plan'
import { inject } from '@adonisjs/core'

/**
 * Modules add-ons actifs par organisation (épic #327). Source de vérité de la
 * table `organization_modules` : la résolution des quotas effectifs (#329) et
 * la sync Stripe (#330) passent par ce service, jamais par le modèle direct.
 */
@inject()
export default class OrganizationModuleService {
  async getActiveModules(organizationId: number): Promise<PlanModule[]> {
    const rows = await OrganizationModule.query()
      .where('organizationId', organizationId)
      .select('module')
    return rows.map((row) => row.module)
  }

  /**
   * Quotas effectifs de l'organisation : ceux de son tier fusionnés avec les
   * flags de ses modules actifs (helper pur `resolveEffectiveQuotas`).
   */
  async getEffectiveQuotas(org: Organization): Promise<PlanQuotas> {
    const modules = await this.getActiveModules(org.id)
    return resolveEffectiveQuotas(org.plan, modules)
  }

  async hasModule(organizationId: number, module: PlanModule): Promise<boolean> {
    const row = await OrganizationModule.query()
      .where('organizationId', organizationId)
      .where('module', module)
      .select('id')
      .first()
    return row !== null
  }

  /**
   * Active un module. Idempotent : si le module est déjà actif, la ligne
   * existante est conservée (sa `source` n'est pas écrasée — un module
   * `granted` ne doit pas être requalifié `subscription` par accident).
   */
  async grantModule(
    organizationId: number,
    module: PlanModule,
    options: { source?: ModuleSource; stripeSubscriptionItemId?: string | null } = {}
  ): Promise<OrganizationModule> {
    return OrganizationModule.firstOrCreate(
      { organizationId, module },
      {
        source: options.source ?? 'granted',
        stripeSubscriptionItemId: options.stripeSubscriptionItemId ?? null,
      }
    )
  }

  /**
   * Désactive un module. Par défaut ne touche que les modules issus d'un
   * abonnement : la sync Stripe (#330) ne doit jamais retirer un module
   * offert (`granted`). Passer `source: 'granted'` pour révoquer un don.
   */
  async revokeModule(
    organizationId: number,
    module: PlanModule,
    options: { source?: ModuleSource } = {}
  ): Promise<void> {
    await OrganizationModule.query()
      .where('organizationId', organizationId)
      .where('module', module)
      .where('source', options.source ?? 'subscription')
      .delete()
  }
}
