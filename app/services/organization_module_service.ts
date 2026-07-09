import OrganizationModule from '#models/organization_module'
import Organization from '#models/organization'
import { resolveEffectiveQuotas } from '#shared/helpers/plan'
import { PLAN_MODULES } from '#shared/types/plan'
import type { ModuleSource, PlanModule, PlanQuotas } from '#shared/types/plan'
import { inject } from '@adonisjs/core'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/** Item de module désiré, tel que dérivé des items d'un abonnement Stripe. */
export interface DesiredSubscriptionModule {
  module: PlanModule
  stripeSubscriptionItemId: string
}

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

  /** Modules actifs avec leur origine, pour l'affichage in-app (badge « offert »). */
  async listWithSource(
    organizationId: number
  ): Promise<Array<{ module: PlanModule; source: ModuleSource }>> {
    const rows = await OrganizationModule.query()
      .where('organizationId', organizationId)
      .orderBy('module')
    return rows.map((row) => ({ module: row.module, source: row.source }))
  }

  /** Ligne d'un module souscrit (source `subscription`), pour résilier son item Stripe. */
  async findSubscriptionModule(
    organizationId: number,
    module: PlanModule
  ): Promise<OrganizationModule | null> {
    return OrganizationModule.query()
      .where('organizationId', organizationId)
      .where('module', module)
      .where('source', 'subscription')
      .first()
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

  /**
   * Réconcilie les modules issus d'un abonnement Stripe (source `subscription`)
   * avec l'état désiré dérivé des items de l'abonnement (#330). Opère dans la
   * transaction de la sync pour rester atomique avec l'upsert d'abonnement.
   *
   * - retire les modules `subscription` absents de l'état désiré (item Stripe supprimé) ;
   * - ajoute/actualise les modules désirés (avec leur `stripe_subscription_item_id`) ;
   * - ne touche JAMAIS un module `granted` : s'il couvre déjà le module, on le
   *   laisse tel quel plutôt que de le requalifier en `subscription`.
   */
  async reconcileSubscriptionModules(
    organizationId: number,
    desired: DesiredSubscriptionModule[],
    trx: TransactionClientContract
  ): Promise<{ removed: PlanModule[] }> {
    const existing = await OrganizationModule.query({ client: trx })
      .where('organizationId', organizationId)
      .where('source', 'subscription')

    const desiredModules = new Set(desired.map((d) => d.module))

    const removed: PlanModule[] = []
    for (const row of existing) {
      if (!desiredModules.has(row.module)) {
        await row.useTransaction(trx).delete()
        removed.push(row.module)
      }
    }

    for (const item of desired) {
      const granted = await OrganizationModule.query({ client: trx })
        .where('organizationId', organizationId)
        .where('module', item.module)
        .where('source', 'granted')
        .first()
      if (granted) continue

      await OrganizationModule.updateOrCreate(
        { organizationId, module: item.module },
        { source: 'subscription', stripeSubscriptionItemId: item.stripeSubscriptionItemId },
        { client: trx }
      )
    }

    return { removed }
  }

  /**
   * Grandfathering (#332, lot 5c) : accorde tous les modules en `granted` aux
   * organisations Enterprise existantes, afin qu'aucune ne perde de
   * fonctionnalité au passage à l'offre modulaire. Idempotent (`grantModule`
   * n'écrase pas une ligne existante). Renvoie le nombre de modules réellement
   * ajoutés (les déjà-présents ne sont pas comptés).
   */
  async grantModulesToEnterpriseOrgs(): Promise<{ organizations: number; modulesGranted: number }> {
    const enterpriseOrgs = await Organization.query().where('plan', 'enterprise').select('id')

    let modulesGranted = 0
    for (const org of enterpriseOrgs) {
      for (const module of PLAN_MODULES) {
        const alreadyActive = await this.hasModule(org.id, module)
        await this.grantModule(org.id, module, { source: 'granted' })
        if (!alreadyActive) modulesGranted += 1
      }
    }

    return { organizations: enterpriseOrgs.length, modulesGranted }
  }
}
