import Boat from '#models/boat'
import Organization from '#models/organization'
import OrganizationMembership from '#models/organization_membership'
import Subscription from '#models/subscription'
import OrganizationModuleService from '#services/organization_module_service'
import UserService from '#services/user_service'
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

    console.log('\n✅ BillingModuleStatesSeeder terminé')
    console.log(`   Mot de passe pour tous les comptes : ${TEST_PASSWORD}`)
  }
}
