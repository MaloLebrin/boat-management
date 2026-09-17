import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import QuotaService from '#services/quota_service'
import OrganizationModuleService from '#services/organization_module_service'
import { BoatFactory } from '#database/factories/boat_factory'
import { OrganizationFactory } from '#database/factories/organization_factory'
import type Organization from '#models/organization'

/**
 * Quotas effectifs : tier ⊕ modules ⊕ add-ons ⊖ profil (#698).
 *
 * `resolveEffectiveQuotas` (`shared/helpers/plan.ts`) est le point de passage
 * unique de tout ce qui bloque ou autorise : policies, `QuotaService`, la
 * navigation et le copilote en dépendent. Les tests existants en couvraient des
 * morceaux — la composition complète, elle, ne l'était pas.
 */

function services() {
  const moduleService = new OrganizationModuleService()
  return { moduleService, quotaService: new QuotaService(moduleService) }
}

function quotasOf(org: Organization) {
  return services().moduleService.getEffectiveQuotas(org)
}

test.group('Effective quotas — tiers (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('starter caps boats, members and forbids AI', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'starter' }).create()
    const quotas = await quotasOf(org)

    assert.equal(quotas.maxBoats, 2)
    assert.equal(quotas.maxMembers, 1)
    assert.isFalse(quotas.canUseAI)
    assert.isFalse(quotas.canExport)
  })

  test('pro opens AI, export and 90 days of audit log', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const quotas = await quotasOf(org)

    assert.equal(quotas.maxBoats, 8)
    assert.equal(quotas.maxMembers, 5)
    assert.isTrue(quotas.canUseAI)
    assert.isTrue(quotas.canExport)
    assert.equal(quotas.auditLogRetentionDays, 90)
  })

  test('enterprise is unlimited and carries every module flag', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'enterprise' }).create()
    const quotas = await quotasOf(org)

    assert.isNull(quotas.maxBoats)
    assert.isNull(quotas.maxMembers)
    assert.isTrue(quotas.canManageClients)
    assert.isTrue(quotas.canManageInvoices)
    assert.isTrue(quotas.canManagePricing)
    assert.isTrue(quotas.canManageReservations)
    assert.isTrue(quotas.canWhiteLabel)
  })
})

test.group('Effective quotas — modules and add-ons (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('charter grants pricing and reservations, but never clients', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    await new OrganizationModuleService().grantModule(org.id, 'charter', { source: 'subscription' })

    const quotas = await quotasOf(org)

    assert.isTrue(quotas.canManagePricing)
    assert.isTrue(quotas.canManageReservations)
    // `canManageClients` appartient à `crm_invoicing` : un module n'accorde que
    // ses propres flags.
    assert.isFalse(quotas.canManageClients)
    assert.isFalse(quotas.canManageInvoices)
  })

  test('three extra_boats units raise maxBoats from 8 to 11', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    await new OrganizationModuleService().setAddonQuantity(org.id, 'extra_boats', 3, {
      source: 'subscription',
    })

    const quotas = await quotasOf(org)
    assert.equal(quotas.maxBoats, 11)
  })

  test('the 11th boat is allowed and the 12th is refused', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'pro' }).create()
    const { quotaService } = services()
    await new OrganizationModuleService().setAddonQuantity(org.id, 'extra_boats', 3, {
      source: 'subscription',
    })

    await BoatFactory.merge({ organizationId: org.id }).createMany(10)
    assert.isTrue(await quotaService.canAddBoat(org), '11e bateau : sous le plafond de 11')

    await BoatFactory.merge({ organizationId: org.id }).create()
    // C'est ce nombre-là qui décide d'un refus réel à la création de bateau :
    // le test de l'arithmétique seule ne le prouverait pas.
    assert.isFalse(await quotaService.canAddBoat(org), '12e bateau : plafond atteint')
  })

  test('extra_boats is ignored on an unlimited plan', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'enterprise' }).create()
    await new OrganizationModuleService().setAddonQuantity(org.id, 'extra_boats', 5, {
      source: 'granted',
    })

    const quotas = await quotasOf(org)
    // `null` = illimité : l'incrément ne doit pas le transformer en nombre.
    assert.isNull(quotas.maxBoats)
  })

  test('a private profile loses port mapping even on enterprise', async ({ assert }) => {
    const org = await OrganizationFactory.merge({ plan: 'enterprise', type: 'private' }).create()
    const quotas = await quotasOf(org)

    assert.isFalse(quotas.canManagePorts, 'la cartographie marina ne sert pas un particulier')
    assert.isTrue(quotas.canUseAI, 'le reste du plan Entreprise est intact')
  })
})
