import OrganizationModule from '#models/organization_module'
import Organization from '#models/organization'
import { resolveEffectiveQuotas } from '#shared/helpers/plan'
import { isPlanAddon, isPlanModule, PLAN_MODULES } from '#shared/types/plan'
import type {
  ActiveAddonInfo,
  ModuleSource,
  PlanAddon,
  PlanModule,
  PlanQuotas,
} from '#shared/types/plan'
import { inject } from '@adonisjs/core'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

/**
 * Item désiré dérivé d'un item d'abonnement Stripe. Couvre modules booléens
 * (`quantity` = 1, ignorée) et add-ons quantitatifs (`quantity` = nombre
 * d'unités de l'item Stripe).
 */
export interface DesiredSubscriptionModule {
  module: PlanModule | PlanAddon
  stripeSubscriptionItemId: string
  quantity: number
}

/**
 * Modules add-ons actifs par organisation (épic #327). Source de vérité de la
 * table `organization_modules` : la résolution des quotas effectifs (#329) et
 * la sync Stripe (#330) passent par ce service, jamais par le modèle direct.
 */
@inject()
export default class OrganizationModuleService {
  /** Modules booléens actifs (exclut les lignes d'add-on quantitatif). */
  async getActiveModules(organizationId: number): Promise<PlanModule[]> {
    const rows = await OrganizationModule.query()
      .where('organizationId', organizationId)
      .select('module')
    return rows.map((row) => row.module).filter((m): m is PlanModule => isPlanModule(m))
  }

  /** Add-ons quantitatifs actifs avec leur quantité et origine (ex. `extra_boats`). */
  async getActiveAddons(organizationId: number): Promise<ActiveAddonInfo[]> {
    const rows = await OrganizationModule.query()
      .where('organizationId', organizationId)
      .orderBy('module')
    return rows
      .filter((row) => isPlanAddon(row.module))
      .map((row) => ({
        addon: row.module as PlanAddon,
        quantity: row.quantity,
        source: row.source,
      }))
  }

  /**
   * Modules booléens actifs avec leur origine, pour l'affichage in-app (badge
   * « offert »). Exclut les add-ons quantitatifs (exposés via `getActiveAddons`).
   */
  async listWithSource(
    organizationId: number
  ): Promise<Array<{ module: PlanModule; source: ModuleSource }>> {
    const rows = await OrganizationModule.query()
      .where('organizationId', organizationId)
      .orderBy('module')
    return rows
      .filter((row) => isPlanModule(row.module))
      .map((row) => ({ module: row.module as PlanModule, source: row.source }))
  }

  /**
   * Ligne souscrite (source `subscription`) d'un module ou add-on, pour
   * résilier / mettre à jour son item Stripe.
   */
  async findSubscriptionModule(
    organizationId: number,
    module: PlanModule | PlanAddon
  ): Promise<OrganizationModule | null> {
    return OrganizationModule.query()
      .where('organizationId', organizationId)
      .where('module', module)
      .where('source', 'subscription')
      .first()
  }

  /**
   * Quotas effectifs de l'organisation : ceux de son tier, fusionnés avec les
   * flags de ses modules actifs, puis augmentés par ses add-ons quantitatifs
   * (helper pur `resolveEffectiveQuotas`).
   */
  async getEffectiveQuotas(org: Organization): Promise<PlanQuotas> {
    const rows = await OrganizationModule.query().where('organizationId', org.id)
    const modules = rows.map((row) => row.module).filter((m): m is PlanModule => isPlanModule(m))
    const addons = rows
      .filter((row) => isPlanAddon(row.module))
      .map((row) => ({ addon: row.module as PlanAddon, quantity: row.quantity }))
    return resolveEffectiveQuotas(org.plan, modules, addons)
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
   * Fixe la quantité d'un add-on quantitatif (ex. `extra_boats`). `quantity <= 0`
   * retire la ligne. Utilisé pour un don manuel / les tests ; la sync Stripe
   * passe par `reconcileSubscriptionModules`.
   */
  async setAddonQuantity(
    organizationId: number,
    addon: PlanAddon,
    quantity: number,
    options: { source?: ModuleSource; stripeSubscriptionItemId?: string | null } = {}
  ): Promise<void> {
    const source = options.source ?? 'granted'
    if (quantity <= 0) {
      await OrganizationModule.query()
        .where('organizationId', organizationId)
        .where('module', addon)
        .where('source', source)
        .delete()
      return
    }
    await OrganizationModule.updateOrCreate(
      { organizationId, module: addon },
      { source, quantity, stripeSubscriptionItemId: options.stripeSubscriptionItemId ?? null }
    )
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
  ): Promise<{ removed: Array<PlanModule | PlanAddon> }> {
    const existing = await OrganizationModule.query({ client: trx })
      .where('organizationId', organizationId)
      .where('source', 'subscription')

    const desiredModules = new Set(desired.map((d) => d.module))

    const removed: Array<PlanModule | PlanAddon> = []
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
        {
          source: 'subscription',
          stripeSubscriptionItemId: item.stripeSubscriptionItemId,
          quantity: item.quantity,
        },
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
