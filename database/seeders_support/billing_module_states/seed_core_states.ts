import type Organization from '#models/organization'
import type User from '#models/user'
import type OrganizationModuleService from '#services/organization_module_service'
import {
  ensureBoats,
  ensureOwner,
  ensureTeamMember,
} from '#database/seeders_support/billing_module_states/org_helpers'
import { ensureSubscription } from '#database/seeders_support/billing_module_states/subscription_helpers'
import {
  ensureAddon,
  ensureModule,
} from '#database/seeders_support/billing_module_states/module_helpers'

export interface CoreStatesResult {
  proWithModulesUser: User
  proWithModulesOrg: Organization
  proGrantedUser: User
  proGrantedOrg: Organization
  enterpriseBaselineUser: User
  enterpriseBaselineOrg: Organization
  enterpriseGrantedUser: User
  enterpriseGrantedOrg: Organization
}

/**
 * États cœur de la matrice plan/abonnement/module de `/settings/billing`
 * (fix #402) : Starter, Pro sans/avec abonnement, modules souscrits/offerts,
 * add-on `extra_boats`, Enterprise sans/avec lignes `organization_modules`.
 * Retourne les orgs/users réutilisés par les données métier (section 21).
 */
export async function seedCoreStates(
  moduleService: OrganizationModuleService
): Promise<CoreStatesResult> {
  // ─── 1. Starter baseline : aucun accès module, upsell partout ───────────
  const { org: starterOrg } = await ensureOwner(
    'starter-baseline@test.local',
    'Sam Starter',
    'starter'
  )
  await ensureBoats(starterOrg.id, 1, 'Starter Boat')
  console.log(`✓ starter-baseline@test.local — proRequired sur tous les modules`)

  // ─── 2. Pro sans abonnement : admin voit un CTA d'activation, membre un message ──
  const { org: proNoSubOrg } = await ensureOwner('pro-no-sub-admin@test.local', 'Nina NoSub', 'pro')
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
  const { user: proWithModulesUser, org: proWithModulesOrg } = await ensureOwner(
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
  const { user: proGrantedUser, org: proGrantedOrg } = await ensureOwner(
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
  const { user: enterpriseBaselineUser, org: enterpriseBaselineOrg } = await ensureOwner(
    'enterprise-baseline@test.local',
    'Odile Baseline',
    'enterprise'
  )
  await ensureBoats(enterpriseBaselineOrg.id, 1, 'Enterprise Boat')
  console.log(`✓ enterprise-baseline — tous modules includedInPlan sans aucune ligne en base`)

  // ─── 9. Enterprise avec lignes granted (mirror du grandfathering) ──────
  const { user: enterpriseGrantedUser, org: enterpriseGrantedOrg } = await ensureOwner(
    'enterprise-granted@test.local',
    'Pierre Grandfather',
    'enterprise'
  )
  await ensureModule(moduleService, enterpriseGrantedOrg.id, 'charter', 'granted')
  await ensureModule(moduleService, enterpriseGrantedOrg.id, 'crm_invoicing', 'granted')
  await ensureBoats(enterpriseGrantedOrg.id, 1, 'Grandfather Boat')
  console.log(`✓ enterprise-granted — lignes granted présentes, includedInPlan inchangé`)

  return {
    proWithModulesUser,
    proWithModulesOrg,
    proGrantedUser,
    proGrantedOrg,
    enterpriseBaselineUser,
    enterpriseBaselineOrg,
    enterpriseGrantedUser,
    enterpriseGrantedOrg,
  }
}
