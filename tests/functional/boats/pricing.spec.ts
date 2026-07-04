import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { BoatFactory } from '#database/factories/boat_factory'
import { UserFactory } from '#database/factories/user_factory'
import OrganizationMembership from '#models/organization_membership'
import BoatPricing from '#models/boat_pricing'
import { createAdminUser } from '#tests/functional/helpers'

/**
 * Creates an admin user with an Enterprise plan (required for the pricing feature).
 */
async function createEnterpriseAdminUser() {
  const user = await UserFactory.with('organization', 1, (org) =>
    org.merge({ plan: 'enterprise' })
  ).create()
  if (user.organizationId) {
    await OrganizationMembership.create({
      userId: user.id,
      organizationId: user.organizationId,
      role: 'admin',
    })
  }
  return user
}

test.group('Boat pricing (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('enterprise admin creates pricing for a boat', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.put(`/boats/${boat.id}/pricing`).loginAs(user).form({
      baseDailyPrice: 120,
      baseWeeklyPrice: 700,
      depositAmount: 1500,
      minDays: 2,
      maxDays: 14,
      currency: 'EUR',
    })

    response.assertStatus(200)

    const pricing = await BoatPricing.query().where('boatId', boat.id).firstOrFail()
    assert.equal(Number(pricing.baseDailyPrice), 120)
    assert.equal(Number(pricing.baseWeeklyPrice), 700)
    assert.equal(Number(pricing.depositAmount), 1500)
    assert.equal(pricing.minDays, 2)
    assert.equal(pricing.maxDays, 14)
    assert.equal(pricing.currency, 'EUR')
    assert.equal(pricing.organizationId, user.organizationId!)
  })

  test('second PUT upserts the same row (no duplicate)', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await client.put(`/boats/${boat.id}/pricing`).loginAs(user).form({ baseDailyPrice: 100 })
    await client.put(`/boats/${boat.id}/pricing`).loginAs(user).form({ baseDailyPrice: 200 })

    const rows = await BoatPricing.query().where('boatId', boat.id)
    assert.lengthOf(rows, 1)
    assert.equal(Number(rows[0].baseDailyPrice), 200)
  })

  test('partial update preserves untouched fields', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await BoatPricing.create({
      organizationId: user.organizationId!,
      boatId: boat.id,
      baseDailyPrice: '100.00',
      depositAmount: '900.00',
      currency: 'EUR',
    })

    // Only the daily price is sent; the deposit must be preserved.
    await client.put(`/boats/${boat.id}/pricing`).loginAs(user).form({ baseDailyPrice: 150 })

    const pricing = await BoatPricing.query().where('boatId', boat.id).firstOrFail()
    assert.equal(Number(pricing.baseDailyPrice), 150)
    assert.equal(Number(pricing.depositAmount), 900)
  })

  test('maxDays lower than minDays is rejected', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .put(`/boats/${boat.id}/pricing`)
      .loginAs(user)
      .form({ baseDailyPrice: 100, minDays: 10, maxDays: 3 })
      .redirects(0)

    response.assertStatus(302)

    const pricing = await BoatPricing.query().where('boatId', boat.id).first()
    assert.isNull(pricing)
  })

  test('non-enterprise (pro) org is blocked with flash', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .put(`/boats/${boat.id}/pricing`)
      .loginAs(user)
      .form({ baseDailyPrice: 100 })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'This feature requires the Enterprise plan.')

    const pricing = await BoatPricing.query().where('boatId', boat.id).first()
    assert.isNull(pricing)
  })

  test('starter org is blocked', async ({ client, assert }) => {
    const user = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'starter' })
    ).create()
    if (user.organizationId) {
      await OrganizationMembership.create({
        userId: user.id,
        organizationId: user.organizationId,
        role: 'admin',
      })
    }
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .put(`/boats/${boat.id}/pricing`)
      .loginAs(user)
      .form({ baseDailyPrice: 100 })
      .redirects(0)

    response.assertStatus(302)

    const pricing = await BoatPricing.query().where('boatId', boat.id).first()
    assert.isNull(pricing)
  })

  test('cannot set pricing on a boat from another organization (IDOR)', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()

    const otherUser = await UserFactory.with('organization', 1, (org) =>
      org.merge({ plan: 'enterprise' })
    ).create()
    const foreignBoat = await BoatFactory.merge({
      organizationId: otherUser.organizationId!,
    }).create()

    const response = await client
      .put(`/boats/${foreignBoat.id}/pricing`)
      .loginAs(user)
      .form({ baseDailyPrice: 100 })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')

    const pricing = await BoatPricing.query().where('boatId', foreignBoat.id).first()
    assert.isNull(pricing)
  })

  test('unauthenticated user is redirected to login', async ({ client }) => {
    const boat = await BoatFactory.with('organization', 1).create()

    const response = await client.put(`/boats/${boat.id}/pricing`).form({ baseDailyPrice: 100 })

    response.assertRedirectsTo('/login')
  })

  test('boat detail exposes pricing and enables the tab for enterprise', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    await BoatPricing.create({
      organizationId: user.organizationId!,
      boatId: boat.id,
      baseDailyPrice: '250.00',
      currency: 'EUR',
    })

    const response = await client.get(`/boats/${boat.id}`).loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as {
      pricingEnabled: boolean
      canManagePricing: boolean
      pricing: { baseDailyPrice: number; currency: string } | null
    }
    assert.isTrue(props.pricingEnabled)
    assert.isTrue(props.canManagePricing)
    assert.isNotNull(props.pricing)
    assert.equal(props.pricing!.baseDailyPrice, 250)
  })

  test('boat detail disables the pricing tab for non-enterprise', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client.get(`/boats/${boat.id}`).loginAs(user).withInertia()

    response.assertStatus(200)
    const props = response.inertiaProps as { pricingEnabled: boolean; pricing: unknown }
    assert.isFalse(props.pricingEnabled)
    assert.isNull(props.pricing)
  })
})
