import Stripe from 'stripe'
import env from '#start/env'
import type { ApiClient } from '@japa/api-client'

/**
 * Fabriques partagées d'objets Stripe pour les suites Japa (#698).
 *
 * Avant ce module, l'objet `Stripe.Subscription` factice était réécrit dans
 * chaque spec de `tests/functional/billing/` — cinq variantes divergentes qui
 * différaient sur l'`id`, la présence de `quantity` et la forme de l'item.
 * Ici : un seul constructeur, et les price IDs lus depuis `env` plutôt que
 * recopiés en dur, pour qu'un renommage dans `.env.test` casse bruyamment au
 * lieu de faire silencieusement retomber `planFromPriceId` sur `starter`.
 */

function requiredPriceId(key: Parameters<typeof env.get>[0]): string {
  const value = env.get(key)
  if (typeof value !== 'string' || !value) {
    throw new Error(`${String(key)} manque dans .env.test — les fixtures Stripe en dépendent`)
  }
  return value
}

/** Price IDs de test, tels que `.env.test` les déclare. */
export const PRICE_IDS = {
  get proMonth() {
    return requiredPriceId('STRIPE_PRO_MONTHLY_PRICE_ID')
  },
  get proYear() {
    return requiredPriceId('STRIPE_PRO_ANNUAL_PRICE_ID')
  },
  get enterpriseMonth() {
    return requiredPriceId('STRIPE_ENTERPRISE_MONTHLY_PRICE_ID')
  },
  get charterMonth() {
    return requiredPriceId('STRIPE_MODULE_CHARTER_MONTHLY_PRICE_ID')
  },
  get crmMonth() {
    return requiredPriceId('STRIPE_MODULE_CRM_INVOICING_MONTHLY_PRICE_ID')
  },
  get extraBoatsMonth() {
    return requiredPriceId('STRIPE_ADDON_EXTRA_BOATS_MONTHLY_PRICE_ID')
  },
}

/**
 * Prix qui ne mappe ni un tier, ni un module, ni un add-on. `planFromPriceId`
 * retombe dessus sur `'starter'` — c'est ce qui permet de tester les bornes de
 * période indépendamment du plan.
 */
export const UNMAPPED_PRICE_ID = 'price_unmapped'

/** Bornes de période par défaut : dans le futur, pour rester stables dans le temps. */
export const PERIOD_START = Math.floor(Date.UTC(2030, 0, 10) / 1000)
export const PERIOD_END = Math.floor(Date.UTC(2030, 1, 10) / 1000)
export const BILLING_CYCLE_ANCHOR = Math.floor(Date.UTC(2020, 0, 1) / 1000)

export interface StripeItemOptions {
  id?: string
  quantity?: number
  interval?: 'month' | 'year'
  intervalCount?: number
  periodStart?: number
  periodEnd?: number
}

/**
 * Un item d'abonnement. Les bornes de période vivent sur l'item et non sur
 * l'abonnement depuis l'API embarquée par le SDK — `getPeriodBounds` les lit
 * telles quelles.
 */
export function stripeSubscriptionItem(
  priceId: string,
  options: StripeItemOptions = {}
): Stripe.SubscriptionItem {
  return {
    id: options.id ?? `si_${priceId}`,
    quantity: options.quantity ?? 1,
    price: {
      id: priceId,
      recurring: {
        interval: options.interval ?? 'month',
        interval_count: options.intervalCount ?? 1,
      },
    },
    current_period_start: options.periodStart ?? PERIOD_START,
    current_period_end: options.periodEnd ?? PERIOD_END,
  } as unknown as Stripe.SubscriptionItem
}

export interface StripeSubscriptionOptions {
  id?: string
  customer: string
  status?: Stripe.Subscription.Status
  items?: Stripe.SubscriptionItem[]
  /** Raccourci : un abonnement mono-item sur ce prix. */
  priceId?: string
  anchor?: number
  cancelAtPeriodEnd?: boolean
}

/**
 * Le sous-ensemble de `Stripe.Subscription` que `syncFromSubscriptionEvent`
 * consomme réellement. Le cast est fait ici, une fois, plutôt que dans chaque
 * spec.
 */
export function stripeSubscription(options: StripeSubscriptionOptions): Stripe.Subscription {
  const items = options.items ?? [
    stripeSubscriptionItem(options.priceId ?? UNMAPPED_PRICE_ID, { id: 'si_tier' }),
  ]

  return {
    id: options.id ?? 'sub_test',
    customer: options.customer,
    status: options.status ?? 'active',
    cancel_at_period_end: options.cancelAtPeriodEnd ?? false,
    billing_cycle_anchor: options.anchor ?? BILLING_CYCLE_ANCHOR,
    items: { data: items },
  } as unknown as Stripe.Subscription
}

/** Enveloppe un objet dans la forme d'un événement webhook Stripe. */
export function stripeEvent<T>(type: string, object: T, id = 'evt_test'): Stripe.Event {
  return {
    id,
    object: 'event',
    api_version: null,
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
    type,
    data: { object },
  } as unknown as Stripe.Event
}

/**
 * Une session de checkout, telle que `syncFromCheckoutSession` la lit : elle
 * n'en consomme que `customer` et `subscription`, puis va chercher
 * l'abonnement complet chez Stripe.
 */
export function stripeCheckoutSession(options: {
  customer: string
  subscription: string
}): Stripe.Checkout.Session {
  return {
    id: 'cs_test',
    object: 'checkout.session',
    customer: options.customer,
    subscription: options.subscription,
    mode: 'subscription',
  } as unknown as Stripe.Checkout.Session
}

/**
 * Signe un corps brut avec le secret de webhook de `.env.test`.
 *
 * La signature porte sur les **octets exacts** : le corps envoyé doit être la
 * chaîne retournée ici, jamais un objet re-sérialisé par le client HTTP. D'où
 * `signedWebhookRequest`, qui sérialise une fois et rend les deux ensemble.
 */
export function signedWebhookRequest(event: Stripe.Event): { payload: string; signature: string } {
  const secret = env.get('STRIPE_WEBHOOK_SECRET')
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET manque dans .env.test')

  const payload = JSON.stringify(event)

  return {
    payload,
    // Pas de réseau : `generateTestHeaderString` calcule le même HMAC que
    // Stripe côté serveur, et `constructEvent` le revérifie.
    signature: Stripe.webhooks.generateTestHeaderString({ payload, secret }),
  }
}

/**
 * POST un événement sur `/webhooks/stripe` avec une signature valide.
 *
 * Passe par `client.json(payload)` avec une **chaîne** : Japa la transmet telle
 * quelle à superagent, qui l'envoie sans la re-sérialiser. Le piège que ce
 * helper referme : `client.send(x)` **n'est pas** un setter de corps — c'est la
 * méthode qui exécute la requête, et l'argument est ignoré, si bien que le
 * handler reçoit un `request.raw()` vide et répond 400 sans rien dire.
 *
 * - `signature: null` omet complètement l'en-tête ;
 * - `payload` envoie un corps différent de celui qui a été signé, pour prouver
 *   que le HMAC porte bien sur le corps.
 */
export function postStripeWebhook(
  client: ApiClient,
  event: Stripe.Event,
  options: { signature?: string | null; payload?: string } = {}
) {
  const signed = signedWebhookRequest(event)
  const signature = options.signature === undefined ? signed.signature : options.signature

  const request = client.post('/webhooks/stripe')
  if (signature !== null) request.header('stripe-signature', signature)

  return request.json(options.payload ?? signed.payload)
}
