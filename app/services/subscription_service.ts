import Organization from '#models/organization'
import Subscription from '#models/subscription'
import type { BillingInterval, SubscriptionInfo, SubscriptionStatus } from '#shared/types/billing'
import { isPlanModule } from '#shared/types/plan'
import type { PlanAddon, PlanModule, PlanTier } from '#shared/types/plan'
import StripeService from '#services/stripe_service'
import OrganizationModuleService from '#services/organization_module_service'
import type { DesiredSubscriptionModule } from '#services/organization_module_service'
import OrganizationPlanDowngraded from '#events/organization_plan_downgraded'
import OrganizationPlanUpgraded from '#events/organization_plan_upgraded'
import OrganizationModuleDeactivated from '#events/organization_module_deactivated'
import { inject } from '@adonisjs/core'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import type Stripe from 'stripe'

const PLAN_ORDER: Record<PlanTier, number> = { starter: 0, pro: 1, enterprise: 2 }

@inject()
export default class SubscriptionService {
  constructor(
    private stripeService: StripeService,
    private organizationModuleService: OrganizationModuleService
  ) {}
  async getActive(organizationId: number): Promise<Subscription | null> {
    return Subscription.query()
      .where('organizationId', organizationId)
      .whereIn('status', ['active', 'trialing', 'past_due'])
      .first()
  }

  toInfo(sub: Subscription): SubscriptionInfo {
    return {
      id: sub.id,
      status: sub.status,
      planTier: sub.planTier,
      billingInterval: sub.billingInterval,
      currentPeriodEnd: sub.currentPeriodEnd.toISO()!,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    }
  }

  /**
   * `trx` optionnel (#703) : quand le webhook fournit sa transaction, la
   * synchro s'y inscrit au lieu d'en ouvrir une seconde, pour que la trace
   * d'idempotence et les écritures qu'elle couvre soient commitées **ensemble**.
   * Sans `trx`, le comportement est inchangé — la synchro ouvre et commite la
   * sienne, comme tous les appelants directs (tests de service compris).
   */
  async syncFromCheckoutSession(
    session: Stripe.Checkout.Session,
    trx?: TransactionClientContract
  ): Promise<void> {
    if (!session.subscription || !session.customer) return

    const org = await Organization.query()
      .where('stripe_customer_id', String(session.customer))
      .first()

    if (!org) return

    const stripeSub = await this.stripeService.retrieveSubscription(String(session.subscription))
    const tierItem = this.resolveTierItem(stripeSub)
    if (!tierItem) return this.skipItemlessSubscription(stripeSub, org.id)

    const plan = this.planFromPriceId(tierItem.price.id)
    const desiredModules = this.desiredModulesFrom(stripeSub, plan)

    await this.runInTransaction(trx, (tx) =>
      this.applySync(org, stripeSub, tierItem, plan, desiredModules, tx)
    )
  }

  async syncFromSubscriptionEvent(
    stripeSub: Stripe.Subscription,
    trx?: TransactionClientContract
  ): Promise<void> {
    const org = await Organization.query()
      .where('stripe_customer_id', String(stripeSub.customer))
      .first()

    if (!org) return

    const tierItem = this.resolveTierItem(stripeSub)
    if (!tierItem) return this.skipItemlessSubscription(stripeSub, org.id)

    const newPlan =
      stripeSub.status === 'canceled' ? 'starter' : this.planFromPriceId(tierItem.price.id)
    const desiredModules = this.desiredModulesFrom(stripeSub, newPlan)

    await this.runInTransaction(trx, (tx) =>
      this.applySync(org, stripeSub, tierItem, newPlan, desiredModules, tx)
    )
  }

  /**
   * Exécute `work` dans la transaction fournie, ou dans une transaction
   * ouverte pour l'occasion. Rejoindre celle de l'appelant plutôt que d'en
   * ouvrir une seconde est ce qui rend l'écriture de la trace d'idempotence et
   * la synchro atomiques (#703) : deux transactions distinctes laisseraient une
   * fenêtre où l'événement est marqué traité sans l'avoir été, ou l'inverse.
   */
  private async runInTransaction(
    trx: TransactionClientContract | undefined,
    work: (tx: TransactionClientContract) => Promise<void>
  ): Promise<void> {
    if (trx) return work(trx)
    await db.transaction(work)
  }

  /**
   * Le corps de la synchro, transaction fournie.
   *
   * La garde d'appartenance (#705) vit **ici**, donc dans la transaction : hors
   * d'elle, une livraison concurrente pourrait insérer la ligne entre le
   * contrôle et l'écriture, et l'on retomberait sur la violation d'unicité
   * brute — la 500 rejouée indéfiniment que l'issue décrit. Rien n'est écrit
   * quand elle se déclenche : ni `subscriptions`, ni le plan, ni les modules.
   *
   * Les events de changement de plan et de désactivation de module partent
   * **après commit** via `trx.after('commit')` : leurs listeners envoient des
   * e-mails et des notifications, qui ne doivent jamais s'appuyer sur une
   * transaction encore annulable. Le hook vaut aussi bien pour la transaction
   * ouverte ici que pour celle du webhook — Lucid attend ses handlers
   * `after:commit` avant de rendre la main.
   */
  private async applySync(
    org: Organization,
    stripeSub: Stripe.Subscription,
    tierItem: Stripe.SubscriptionItem,
    plan: PlanTier,
    desiredModules: DesiredSubscriptionModule[],
    trx: TransactionClientContract
  ): Promise<void> {
    const heldBy = await this.subscriptionHolderElsewhere(org.id, stripeSub.id, trx)
    if (heldBy !== null) {
      this.logSubscriptionOwnershipConflict(stripeSub, org, heldBy)
      return
    }

    await this.upsertSubscription(org.id, stripeSub, tierItem, trx)
    const reconciled = await this.organizationModuleService.reconcileSubscriptionModules(
      org.id,
      desiredModules,
      trx
    )
    const planChange = await this.applyOrgPlan(org, plan, trx)

    trx.after('commit', async () => {
      await this.dispatchPlanChange(org, planChange, plan)
      await this.dispatchModuleDeactivations(org, reconciled.removed)
    })
  }

  /**
   * Notifie la désactivation des modules retirés de l'abonnement — APRÈS commit
   * (comme `OrganizationPlanDowngraded`), le listener envoyant emails et
   * notifications qui ne doivent jamais s'appuyer sur une transaction annulable.
   */
  private async dispatchModuleDeactivations(
    org: Organization,
    removed: Array<PlanModule | PlanAddon>
  ): Promise<void> {
    // Seuls les modules booléens déclenchent l'event de désactivation (emails /
    // notifications) ; le retrait d'un add-on quantitatif n'en émet pas.
    for (const module of removed) {
      if (isPlanModule(module)) await OrganizationModuleDeactivated.dispatch(org, module)
    }
  }

  /**
   * Item d'abonnement portant le tier (Pro/Enterprise). Avec le multi-items
   * (#327), il n'est plus forcément à l'index 0. On retient le premier item
   * dont le prix mappe un tier ; à défaut (aucun tier reconnu), le premier item
   * fait foi pour les bornes de période — le plan retombe alors sur `starter`.
   *
   * `null` sur un abonnement **sans aucun item** (#704). Le repli
   * `?? data[0]` rendait alors `undefined` sans que le type le dise, et
   * l'appelant déréférençait `item.price.id` : `TypeError`, remontée en 500 —
   * donc rejouée indéfiniment par Stripe, puisque l'événement produira
   * toujours la même erreur. Le cas n'est pas théorique : un abonnement dont le
   * dernier item vient d'être retiré arrive avec `items.data` vide.
   */
  private resolveTierItem(stripeSub: Stripe.Subscription): Stripe.SubscriptionItem | null {
    if (stripeSub.items.data.length === 0) return null

    const tierItem = stripeSub.items.data.find(
      (item) => this.planFromPriceId(item.price.id) !== 'starter'
    )
    return tierItem ?? stripeSub.items.data[0]
  }

  /**
   * Sortie propre sur un abonnement sans item (#704) : il ne décrit aucun plan
   * et ne porte aucune borne de période, il n'y a donc rien à synchroniser.
   *
   * Rien n'est écrit — ni `subscriptions`, ni le plan de l'organisation, ni les
   * modules —, et le contrôleur répond **200** : l'événement a bien été reçu et
   * compris. Un 4xx/5xx ferait rejouer Stripe pour rien, un rejeu ne peut pas
   * faire apparaître d'item.
   *
   * Loggé en `warn` et non en `info` : un `customer.subscription.deleted` sans
   * item est ignoré ici, donc **ne rétrograde pas** l'organisation. Si ce cas
   * se présentait en production, l'organisation resterait sur son plan payant
   * jusqu'à un événement porteur d'items — cela doit se voir dans les logs.
   */
  private skipItemlessSubscription(stripeSub: Stripe.Subscription, organizationId: number): void {
    logger.warn(
      {
        stripeSubscriptionId: stripeSub.id,
        organizationId,
        status: stripeSub.status,
      },
      'Stripe subscription has no items, nothing to sync'
    )
  }

  /**
   * Modules et add-ons désirés, dérivés des items de l'abonnement. Chaque item
   * d'add-on porte sa quantité Stripe (`item.quantity`), les modules booléens
   * restent à 1. Un abonnement annulé (`plan = 'starter'`) ne conserve rien : la
   * réconciliation retirera alors tous les modules/add-ons `subscription`.
   */
  private desiredModulesFrom(
    stripeSub: Stripe.Subscription,
    plan: PlanTier
  ): DesiredSubscriptionModule[] {
    if (plan === 'starter') return []

    const desired: DesiredSubscriptionModule[] = []
    for (const item of stripeSub.items.data) {
      const module = this.stripeService.moduleForPriceId(item.price.id)
      if (module) {
        desired.push({ module, stripeSubscriptionItemId: item.id, quantity: 1 })
        continue
      }
      const addon = this.stripeService.addonForPriceId(item.price.id)
      if (addon) {
        desired.push({
          module: addon,
          stripeSubscriptionItemId: item.id,
          quantity: item.quantity ?? 1,
        })
      }
    }
    return desired
  }

  /**
   * Organisation qui détient déjà ce `sub_…`, si ce n'est pas celle qu'on
   * s'apprête à synchroniser (#705). `null` sinon.
   *
   * `subscriptions` porte **deux** clés d'unicité : `organization_id` (une
   * organisation a au plus un abonnement) et `stripe_subscription_id` (un
   * abonnement Stripe appartient à au plus une organisation). L'upsert de
   * synchro n'est clé que sur la première : si un `sub_…` rattaché à
   * l'organisation A arrive sur l'organisation B — abonnement déplacé d'un
   * client à l'autre côté Stripe, `stripe_customer_id` réattribué, deux
   * organisations créées depuis le même client —, l'upsert ne trouve rien sur
   * `organizationId = B`, tente un `INSERT`, et PostgreSQL rejette sur la
   * seconde contrainte. L'erreur remontait brute : **500**, donc rejeu Stripe
   * indéfini sur un conflit qu'aucun rejeu ne résoudra.
   *
   * La lecture se fait **dans la transaction de synchro** : hors d'elle, une
   * livraison concurrente pourrait insérer la ligne entre le contrôle et
   * l'écriture, et l'on retomberait sur la violation brute.
   */
  private async subscriptionHolderElsewhere(
    organizationId: number,
    stripeSubscriptionId: string,
    trx: TransactionClientContract
  ): Promise<number | null> {
    const existing = await Subscription.query({ client: trx })
      .select('id', 'organization_id')
      .where('stripeSubscriptionId', stripeSubscriptionId)
      .whereNot('organizationId', organizationId)
      .first()

    return existing?.organizationId ?? null
  }

  /**
   * Conflit d'attribution : on n'écrit rien et on le dit fort (#705).
   *
   * `error` et non `warn` : deux organisations revendiquent le même abonnement
   * Stripe, c'est une incohérence de données qui demande un arbitrage humain,
   * pas une reprise automatique. Deviner laquelle garde l'abonnement
   * reviendrait à retirer son plan payant à l'une des deux sur la foi d'un
   * webhook.
   *
   * Le contrôleur répond **200** : le rejeu ne résoudra jamais un conflit
   * d'attribution, le faire rejouer ne ferait qu'empiler les livraisons.
   */
  private logSubscriptionOwnershipConflict(
    stripeSub: Stripe.Subscription,
    organization: Organization,
    heldByOrganizationId: number
  ): void {
    logger.error(
      {
        stripeSubscriptionId: stripeSub.id,
        stripeCustomerId: String(stripeSub.customer),
        eventOrganizationId: organization.id,
        heldByOrganizationId,
      },
      'Stripe subscription already attached to another organization, sync skipped'
    )
  }

  private async upsertSubscription(
    organizationId: number,
    stripeSub: Stripe.Subscription,
    tierItem: Stripe.SubscriptionItem,
    trx: TransactionClientContract
  ) {
    const priceId = tierItem.price.id
    const { start, end } = this.getPeriodBounds(tierItem)

    await Subscription.updateOrCreate(
      { organizationId },
      {
        stripeSubscriptionId: stripeSub.id,
        stripePriceId: priceId,
        planTier: this.planFromPriceId(priceId),
        status: stripeSub.status as SubscriptionStatus,
        billingInterval: this.intervalFromPriceId(priceId),
        currentPeriodStart: start,
        currentPeriodEnd: end,
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      },
      { client: trx }
    )
  }

  private getPeriodBounds(item: Stripe.SubscriptionItem): { start: DateTime; end: DateTime } {
    // Stripe's current_period bounds are authoritative: they already account for
    // trials, pauses and mid-cycle adjustments, which a recomputation from
    // `billing_cycle_anchor` would get wrong. In the API version shipped with this
    // SDK these fields live on the subscription item (the tier item), not the
    // subscription itself.
    return {
      start: DateTime.fromSeconds(item.current_period_start),
      end: DateTime.fromSeconds(item.current_period_end),
    }
  }

  /**
   * Applies the plan change to the organization within the given transaction.
   * Returns `{ fromPlan, direction }` when the plan actually changes so the
   * caller can dispatch OrganizationPlanDowngraded / OrganizationPlanUpgraded
   * AFTER the transaction commits — the listeners send emails and write
   * notifications, so they must never act on a change that could still roll
   * back. Returns null when the plan is unchanged.
   */
  private async applyOrgPlan(
    org: Organization,
    plan: PlanTier,
    trx: TransactionClientContract
  ): Promise<{ fromPlan: PlanTier; direction: 'up' | 'down' } | null> {
    if (org.plan === plan) return null

    const direction = PLAN_ORDER[plan] < PLAN_ORDER[org.plan] ? 'down' : 'up'
    const fromPlan = org.plan
    org.plan = plan
    await org.useTransaction(trx).save()

    return { fromPlan, direction }
  }

  /**
   * Dispatche l'event de changement de plan APRÈS commit (downgrade ou upgrade).
   * No-op quand le plan est inchangé (`planChange === null`).
   */
  private async dispatchPlanChange(
    org: Organization,
    planChange: { fromPlan: PlanTier; direction: 'up' | 'down' } | null,
    toPlan: PlanTier
  ): Promise<void> {
    if (!planChange) return
    if (planChange.direction === 'down') {
      await OrganizationPlanDowngraded.dispatch(org, planChange.fromPlan, toPlan)
    } else {
      await OrganizationPlanUpgraded.dispatch(org, planChange.fromPlan, toPlan)
    }
  }

  private planFromPriceId(priceId: string): PlanTier {
    const map: Record<string, PlanTier> = {
      [env.get('STRIPE_PRO_MONTHLY_PRICE_ID') ?? '']: 'pro',
      [env.get('STRIPE_PRO_ANNUAL_PRICE_ID') ?? '']: 'pro',
      [env.get('STRIPE_ENTERPRISE_MONTHLY_PRICE_ID') ?? '']: 'enterprise',
      [env.get('STRIPE_ENTERPRISE_ANNUAL_PRICE_ID') ?? '']: 'enterprise',
    }

    return map[priceId] ?? 'starter'
  }

  private intervalFromPriceId(priceId: string): BillingInterval {
    const annualIds = [
      env.get('STRIPE_PRO_ANNUAL_PRICE_ID'),
      env.get('STRIPE_ENTERPRISE_ANNUAL_PRICE_ID'),
    ]

    return annualIds.includes(priceId) ? 'year' : 'month'
  }
}
