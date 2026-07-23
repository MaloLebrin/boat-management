import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import OrganizationMembership from '#models/organization_membership'
import { UserFactory } from '#database/factories/user_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import type { PlanTier } from '#shared/types/plan'

/**
 * Upsell quota bateaux (issue #418) : le front reçoit `canAddBoat` + `boatQuota`
 * (compteur/plafond) pour afficher le badge « x/y », et le flash d'erreur au
 * quota porte une action `errorAction` vers /settings/billing.
 */
async function createAdminWithPlan(plan: PlanTier) {
  const user = await UserFactory.with('organization', 1, (org) => org.merge({ plan })).create()
  await OrganizationMembership.create({
    userId: user.id,
    organizationId: user.organizationId!,
    role: 'admin',
  })
  return user
}

test.group('Boat quota upsell (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /boats exposes boatQuota and canAddBoat=false when at the starter limit', async ({
    client,
  }) => {
    const user = await createAdminWithPlan('starter')
    await BoatFactory.merge({ organizationId: user.organizationId! }).createMany(2)

    const response = await client.get('/boats').loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaPropsContains({
      canAddBoat: false,
      boatQuota: { used: 2, limit: 2 },
    })
  })

  test('GET /boats reports remaining room below the limit', async ({ client }) => {
    const user = await createAdminWithPlan('starter')
    await BoatFactory.merge({ organizationId: user.organizationId! }).createMany(1)

    const response = await client.get('/boats').loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaPropsContains({
      canAddBoat: true,
      boatQuota: { used: 1, limit: 2 },
    })
  })

  test('GET /boats returns an unlimited quota (limit=null) for enterprise', async ({ client }) => {
    const user = await createAdminWithPlan('enterprise')
    await BoatFactory.merge({ organizationId: user.organizationId! }).createMany(3)

    const response = await client.get('/boats').loginAs(user).withInertia()

    response.assertStatus(200)
    response.assertInertiaPropsContains({
      canAddBoat: true,
      boatQuota: { used: 3, limit: null },
    })
  })

  test('GET /boats/new at the quota redirects with a billing upsell action', async ({ client }) => {
    const user = await createAdminWithPlan('starter')
    await BoatFactory.merge({ organizationId: user.organizationId! }).createMany(2)

    const response = await client.get('/boats/new').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
    response.assertFlashMessage('errorAction', '/settings/billing')
  })

  test('POST /boats at the quota flashes an error and the billing upsell action', async ({
    client,
  }) => {
    const user = await createAdminWithPlan('starter')
    await BoatFactory.merge({ organizationId: user.organizationId! }).createMany(2)

    const response = await client
      .post('/boats')
      .loginAs(user)
      .form({ name: 'Overflow', propulsionType: 'motorboat' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('errorAction', '/settings/billing')
  })
})
