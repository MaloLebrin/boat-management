import {
  ensureBoats,
  ensureOwner,
} from '#database/seeders_support/billing_module_states/org_helpers'
import { ensureSubscription } from '#database/seeders_support/billing_module_states/subscription_helpers'

/**
 * Statuts d'abonnement Stripe exhaustifs. `SubscriptionService.getActive()`
 * (app/services/subscription_service.ts) ne considère que active/trialing/
 * past_due comme « abonnement actif » : c'est la seule chose renvoyée au
 * front (`subscription` prop de settings_controller.ts#billing).
 * trialing/past_due sont donc visibles sur la carte Modules comme un Pro
 * actif ; les 5 autres statuts y apparaissent comme « pas d'abonnement »
 * (même état que pro-no-sub-*) mais la ligne `subscriptions` reste en base
 * pour QA d'autres écrans (historique de facturation, reconciliation
 * webhook, etc.).
 */
export async function seedSubscriptionStatuses(): Promise<void> {
  const { org: proTrialingOrg } = await ensureOwner(
    'pro-sub-trialing@test.local',
    'Tom Trial',
    'pro'
  )
  await ensureSubscription(proTrialingOrg.id, 'pro', 'trialing')
  await ensureBoats(proTrialingOrg.id, 1, 'Trial Boat')
  console.log(`✓ pro-sub-trialing — abonnement en période d'essai (compté « actif »)`)

  const { org: proPastDueOrg } = await ensureOwner(
    'pro-sub-past-due@test.local',
    'Paul PastDue',
    'pro'
  )
  await ensureSubscription(proPastDueOrg.id, 'pro', 'past_due')
  await ensureBoats(proPastDueOrg.id, 1, 'PastDue Boat')
  console.log(`✓ pro-sub-past-due — paiement en retard (compté « actif », badge warning)`)

  const { org: proCanceledOrg } = await ensureOwner(
    'pro-sub-canceled@test.local',
    'Claire Canceled',
    'starter' // reflète la vraie règle métier : un abonnement annulé fait retomber le plan sur starter (SubscriptionService.syncFromSubscriptionEvent)
  )
  await ensureSubscription(proCanceledOrg.id, 'starter', 'canceled')
  await ensureBoats(proCanceledOrg.id, 1, 'Canceled Boat')
  console.log(`✓ pro-sub-canceled — abonnement annulé, plan déjà retombé sur starter`)

  const { org: proIncompleteOrg } = await ensureOwner(
    'pro-sub-incomplete@test.local',
    'Ivan Incomplete',
    'pro'
  )
  await ensureSubscription(proIncompleteOrg.id, 'pro', 'incomplete')
  await ensureBoats(proIncompleteOrg.id, 1, 'Incomplete Boat')
  console.log(`✓ pro-sub-incomplete — premier paiement en attente`)

  const { org: proIncompleteExpiredOrg } = await ensureOwner(
    'pro-sub-incomplete-expired@test.local',
    'Eva Expired',
    'pro'
  )
  await ensureSubscription(proIncompleteExpiredOrg.id, 'pro', 'incomplete_expired')
  await ensureBoats(proIncompleteExpiredOrg.id, 1, 'Expired Boat')
  console.log(`✓ pro-sub-incomplete-expired — premier paiement jamais complété`)

  const { org: proUnpaidOrg } = await ensureOwner('pro-sub-unpaid@test.local', 'Uma Unpaid', 'pro')
  await ensureSubscription(proUnpaidOrg.id, 'pro', 'unpaid')
  await ensureBoats(proUnpaidOrg.id, 1, 'Unpaid Boat')
  console.log(`✓ pro-sub-unpaid — relances de paiement épuisées`)

  const { org: proPausedOrg } = await ensureOwner('pro-sub-paused@test.local', 'Pia Paused', 'pro')
  await ensureSubscription(proPausedOrg.id, 'pro', 'paused')
  await ensureBoats(proPausedOrg.id, 1, 'Paused Boat')
  console.log(`✓ pro-sub-paused — abonnement mis en pause`)
}
