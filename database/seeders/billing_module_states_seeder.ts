import AiTokenUsage from '#models/ai_token_usage'
import Boat from '#models/boat'
import Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import Subscription from '#models/subscription'
import OrganizationModuleService from '#services/organization_module_service'
import UserService from '#services/user_service'
import { PLAN_LIMITS } from '#shared/types/plan'
import type { ModuleSource, PlanAddon, PlanModule, PlanTier } from '#shared/types/plan'
import type { SubscriptionStatus } from '#shared/types/billing'
import User from '#models/user'
import app from '@adonisjs/core/services/app'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'

const TEST_PASSWORD = 'Password1!'

/**
 * Ensures a user + org exist for the given email, on the given plan.
 * On first run: creates via signupWithOrganization then patches the plan.
 * On subsequent runs: updates the plan only.
 */
async function ensureOwner(
  email: string,
  fullName: string,
  plan: PlanTier
): Promise<{ user: User; org: Organization }> {
  let user = await User.query().where('email', email).first()

  if (!user) {
    const userService = await app.container.make(UserService)
    const result = await userService.signupWithOrganization({
      email,
      password: TEST_PASSWORD,
      fullName,
    })
    user = result.user
    await result.organization.merge({ plan }).save()
    return { user, org: result.organization }
  }

  const org = await Organization.findOrFail(user.organizationId!)
  if (org.plan !== plan) {
    await org.merge({ plan }).save()
  }
  return { user, org }
}

/**
 * Creates a team member user directly attached to a given org.
 * Skips if a user with that email already exists.
 */
async function ensureTeamMember(
  email: string,
  fullName: string,
  orgId: number,
  role: 'admin' | 'member'
): Promise<void> {
  const existing = await User.query().where('email', email).first()

  let userId: number
  if (!existing) {
    const member = await User.create({
      email,
      password: TEST_PASSWORD,
      fullName,
      organizationId: orgId,
    })
    userId = member.id
  } else {
    userId = existing.id
  }

  const hasMembership = await OrganizationMembership.query()
    .where('userId', userId)
    .where('organizationId', orgId)
    .first()

  if (!hasMembership) {
    await OrganizationMembership.create({ userId, organizationId: orgId, role })
  }
}

/**
 * Creates a boat if none with that name exists in the org.
 */
async function ensureBoat(
  orgId: number,
  name: string,
  extra: Partial<Parameters<typeof Boat.create>[0]> = {}
): Promise<void> {
  const exists = await Boat.query().where('organizationId', orgId).where('name', name).first()
  if (!exists) {
    await Boat.create({ organizationId: orgId, name, ...extra })
  }
}

/** Creates/updates the org's Stripe subscription row (idempotent by organizationId). */
async function ensureSubscription(
  orgId: number,
  planTier: PlanTier,
  status: SubscriptionStatus
): Promise<void> {
  await Subscription.updateOrCreate(
    { organizationId: orgId },
    {
      stripeSubscriptionId: `sub_test_${orgId}`,
      stripePriceId: `price_test_${planTier}_month`,
      planTier,
      status,
      billingInterval: 'month',
      currentPeriodStart: DateTime.now(),
      currentPeriodEnd: DateTime.now().plus({ months: 1 }),
      cancelAtPeriodEnd: false,
    }
  )
}

/** Grants a boolean module via the service (source of truth for `organization_modules`). */
async function ensureModule(
  moduleService: OrganizationModuleService,
  orgId: number,
  module: PlanModule,
  source: ModuleSource
): Promise<void> {
  await moduleService.grantModule(orgId, module, { source })
}

/** Sets a quantitative add-on via the service (source of truth for `organization_modules`). */
async function ensureAddon(
  moduleService: OrganizationModuleService,
  orgId: number,
  addon: PlanAddon,
  quantity: number,
  source: ModuleSource
): Promise<void> {
  await moduleService.setAddonQuantity(orgId, addon, quantity, { source })
}

async function ensureBoats(orgId: number, count: number, namePrefix: string): Promise<void> {
  for (let i = 1; i <= count; i += 1) {
    await ensureBoat(orgId, `${namePrefix} ${i}`, {
      propulsionType: 'sailboat',
      lengthM: 8 + i * 0.3,
      hullMaterial: 'fiberglass',
      yearBuilt: 2015 + i,
    })
  }
}

/** Sets the org's storage usage directly (mirrors the pattern used in quota tests). */
async function ensureStorageUsed(orgId: number, bytes: number): Promise<void> {
  const org = await Organization.findOrFail(orgId)
  await org.merge({ storageUsedBytes: bytes }).save()
}

/** Sets the org's AI token usage for the current month (idempotent, upsert). */
async function ensureAiTokenUsage(orgId: number, tokensUsed: number): Promise<void> {
  const month = DateTime.now().toFormat('yyyy-MM')
  await AiTokenUsage.updateOrCreate({ organizationId: orgId, month }, { tokensUsed })
}

/**
 * Matérialise chaque état de la matrice plan/abonnement/module de
 * `/settings/billing` (cf. fix #402) pour QA manuelle sans passer par Stripe.
 * Ne touche pas aux orgs de `test_plans_seeder.ts`.
 */
export default class BillingModuleStatesSeeder extends BaseSeeder {
  static environment = ['development', 'test']

  async run() {
    const moduleService = await app.container.make(OrganizationModuleService)

    // ─── 1. Starter baseline : aucun accès module, upsell partout ───────────
    const { org: starterOrg } = await ensureOwner(
      'starter-baseline@test.local',
      'Sam Starter',
      'starter'
    )
    await ensureBoats(starterOrg.id, 1, 'Starter Boat')
    console.log(`✓ starter-baseline@test.local — proRequired sur tous les modules`)

    // ─── 2. Pro sans abonnement : admin voit un CTA d'activation, membre un message ──
    const { org: proNoSubOrg } = await ensureOwner(
      'pro-no-sub-admin@test.local',
      'Nina NoSub',
      'pro'
    )
    await ensureTeamMember('pro-no-sub-member@test.local', 'Marc NoSub', proNoSubOrg.id, 'member')
    await ensureBoats(proNoSubOrg.id, 1, 'NoSub Boat')
    console.log(
      `✓ pro-no-sub-admin (admin → activateSubscription) / pro-no-sub-member (→ subscriptionRequired)`
    )

    // ─── 3. Pro abonné actif, sans module : admin voit activate/deactivate, membre adminOnly ──
    const { org: proSubActiveOrg } = await ensureOwner(
      'pro-sub-active-admin@test.local',
      'Alix Active',
      'pro'
    )
    await ensureTeamMember(
      'pro-sub-active-member@test.local',
      'Théo Active',
      proSubActiveOrg.id,
      'member'
    )
    await ensureSubscription(proSubActiveOrg.id, 'pro', 'active')
    await ensureBoats(proSubActiveOrg.id, 1, 'Active Boat')
    console.log(
      `✓ pro-sub-active-admin (→ activate/deactivate) / pro-sub-active-member (→ adminOnly)`
    )

    // ─── 4. Pro abonné actif, modules souscrits (source: subscription) ─────
    const { org: proWithModulesOrg } = await ensureOwner(
      'pro-sub-with-modules@test.local',
      'Julie Modules',
      'pro'
    )
    await ensureSubscription(proWithModulesOrg.id, 'pro', 'active')
    await ensureModule(moduleService, proWithModulesOrg.id, 'charter', 'subscription')
    await ensureModule(moduleService, proWithModulesOrg.id, 'crm_invoicing', 'subscription')
    await ensureBoats(proWithModulesOrg.id, 1, 'Modules Boat')
    console.log(`✓ pro-sub-with-modules — charter + crm_invoicing actifs (deactivate visible)`)

    // ─── 5. Pro abonné actif, un module offert (granted), l'autre non actif ──
    const { org: proGrantedOrg } = await ensureOwner(
      'pro-granted-module@test.local',
      'Karim Granted',
      'pro'
    )
    await ensureSubscription(proGrantedOrg.id, 'pro', 'active')
    await ensureModule(moduleService, proGrantedOrg.id, 'charter', 'granted')
    await ensureBoats(proGrantedOrg.id, 1, 'Granted Boat')
    console.log(
      `✓ pro-granted-module — charter offert (includedInPlan, pas de CTA) / crm_invoicing → activate`
    )

    // ─── 6. Pro + add-on extra_boats souscrit ───────────────────────────────
    const { org: proAddonSubOrg } = await ensureOwner(
      'pro-addon-subscription@test.local',
      'Léa Addon',
      'pro'
    )
    await ensureSubscription(proAddonSubOrg.id, 'pro', 'active')
    await ensureAddon(moduleService, proAddonSubOrg.id, 'extra_boats', 3, 'subscription')
    await ensureBoats(proAddonSubOrg.id, 9, 'Addon Boat') // quota effectif 8+3=11
    console.log(`✓ pro-addon-subscription — extra_boats x3 souscrit (maxBoats effectif = 11)`)

    // ─── 7. Pro + add-on extra_boats offert (don commercial) ───────────────
    const { org: proAddonGrantedOrg } = await ensureOwner(
      'pro-addon-granted@test.local',
      'Hugo Cadeau',
      'pro'
    )
    await ensureSubscription(proAddonGrantedOrg.id, 'pro', 'active')
    await ensureAddon(moduleService, proAddonGrantedOrg.id, 'extra_boats', 2, 'granted')
    await ensureBoats(proAddonGrantedOrg.id, 2, 'Cadeau Boat')
    console.log(`✓ pro-addon-granted — extra_boats x2 offert (maxBoats effectif = 10)`)

    // ─── 8. Enterprise baseline : aucune ligne organization_modules ────────
    const { org: enterpriseBaselineOrg } = await ensureOwner(
      'enterprise-baseline@test.local',
      'Odile Baseline',
      'enterprise'
    )
    await ensureBoats(enterpriseBaselineOrg.id, 1, 'Enterprise Boat')
    console.log(`✓ enterprise-baseline — tous modules includedInPlan sans aucune ligne en base`)

    // ─── 9. Enterprise avec lignes granted (mirror du grandfathering) ──────
    const { org: enterpriseGrantedOrg } = await ensureOwner(
      'enterprise-granted@test.local',
      'Pierre Grandfather',
      'enterprise'
    )
    await ensureModule(moduleService, enterpriseGrantedOrg.id, 'charter', 'granted')
    await ensureModule(moduleService, enterpriseGrantedOrg.id, 'crm_invoicing', 'granted')
    await ensureBoats(enterpriseGrantedOrg.id, 1, 'Grandfather Boat')
    console.log(`✓ enterprise-granted — lignes granted présentes, includedInPlan inchangé`)

    // ─── 10-16. Statuts d'abonnement Stripe exhaustifs ──────────────────────
    // `SubscriptionService.getActive()` (app/services/subscription_service.ts)
    // ne considère que active/trialing/past_due comme « abonnement actif » :
    // c'est la seule chose renvoyée au front (`subscription` prop de
    // settings_controller.ts#billing). trialing/past_due sont donc visibles
    // sur la carte Modules comme un Pro actif ; les 5 autres statuts y
    // apparaissent comme « pas d'abonnement » (même état que pro-no-sub-*)
    // mais la ligne `subscriptions` reste en base pour QA d'autres écrans
    // (historique de facturation, reconciliation webhook, etc.).
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

    const { org: proUnpaidOrg } = await ensureOwner(
      'pro-sub-unpaid@test.local',
      'Uma Unpaid',
      'pro'
    )
    await ensureSubscription(proUnpaidOrg.id, 'pro', 'unpaid')
    await ensureBoats(proUnpaidOrg.id, 1, 'Unpaid Boat')
    console.log(`✓ pro-sub-unpaid — relances de paiement épuisées`)

    const { org: proPausedOrg } = await ensureOwner(
      'pro-sub-paused@test.local',
      'Pia Paused',
      'pro'
    )
    await ensureSubscription(proPausedOrg.id, 'pro', 'paused')
    await ensureBoats(proPausedOrg.id, 1, 'Paused Boat')
    console.log(`✓ pro-sub-paused — abonnement mis en pause`)

    // ─── 17-20. Cas limites de quota ────────────────────────────────────────
    const storageLimitBytesPro = PLAN_LIMITS.pro.storageGb! * 1024 * 1024 * 1024

    const { org: storage80Org } = await ensureOwner(
      'pro-quota-storage-80@test.local',
      'Simon Storage80',
      'pro'
    )
    await ensureSubscription(storage80Org.id, 'pro', 'active')
    await ensureStorageUsed(storage80Org.id, Math.round(storageLimitBytesPro * 0.8))
    await ensureBoats(storage80Org.id, 1, 'Storage80 Boat')
    console.log(`✓ pro-quota-storage-80 — stockage à 80% du quota Pro (20GB)`)

    const { org: storage100Org } = await ensureOwner(
      'pro-quota-storage-100@test.local',
      'Sara Storage100',
      'pro'
    )
    await ensureSubscription(storage100Org.id, 'pro', 'active')
    await ensureStorageUsed(storage100Org.id, Math.round(storageLimitBytesPro * 1.02))
    await ensureBoats(storage100Org.id, 1, 'Storage100 Boat')
    console.log(`✓ pro-quota-storage-100 — stockage au-delà du quota Pro (20GB)`)

    const { org: aiNearLimitOrg } = await ensureOwner(
      'pro-quota-ai-near-limit@test.local',
      'Amir AiTokens',
      'pro'
    )
    await ensureSubscription(aiNearLimitOrg.id, 'pro', 'active')
    await ensureAiTokenUsage(
      aiNearLimitOrg.id,
      Math.round(PLAN_LIMITS.pro.aiTokensPerMonth! * 0.85)
    )
    await ensureBoats(aiNearLimitOrg.id, 1, 'AiTokens Boat')
    console.log(`✓ pro-quota-ai-near-limit — 85% du quota mensuel de tokens IA Pro`)

    const { org: boatsAtLimitOrg } = await ensureOwner(
      'pro-quota-boats-at-limit@test.local',
      'Bilal BoatsLimit',
      'pro'
    )
    await ensureSubscription(boatsAtLimitOrg.id, 'pro', 'active')
    await ensureBoats(boatsAtLimitOrg.id, PLAN_LIMITS.pro.maxBoats!, 'AtLimit Boat')
    console.log(
      `✓ pro-quota-boats-at-limit — exactement ${PLAN_LIMITS.pro.maxBoats} bateaux (plafond Pro)`
    )

    console.log('\n✅ BillingModuleStatesSeeder terminé')
    console.log(`   Mot de passe pour tous les comptes : ${TEST_PASSWORD}`)
  }
}
