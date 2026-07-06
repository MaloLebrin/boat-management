import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { MediaFactory } from '#database/factories/media_factory'
import { UserFactory } from '#database/factories/user_factory'
import Client from '#models/client'
import OrganizationMembership from '#models/organization_membership'
import { createAdminUser } from '#tests/functional/helpers'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

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

test.group('Client GDPR consent + export (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('create with gdprConsent=true stamps gdpr_consent_at', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    await client.post('/clients').loginAs(user).form({
      firstName: 'Consent',
      lastName: 'Given',
      gdprConsent: true,
    })

    const created = await Client.query()
      .where('organizationId', user.organizationId!)
      .where('firstName', 'Consent')
      .firstOrFail()
    assert.isNotNull(created.gdprConsentAt)
  })

  test('create without consent leaves gdpr_consent_at null', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()

    await client.post('/clients').loginAs(user).form({
      firstName: 'No',
      lastName: 'Consent',
    })

    const created = await Client.query()
      .where('organizationId', user.organizationId!)
      .where('firstName', 'No')
      .firstOrFail()
    assert.isNull(created.gdprConsentAt)
  })

  test('update sets then clears consent', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const record = await Client.create({
      organizationId: user.organizationId!,
      firstName: 'Toggle',
      lastName: 'Consent',
      status: 'active',
    })

    await client
      .put(`/clients/${record.id}`)
      .loginAs(user)
      .form({ firstName: 'Toggle', lastName: 'Consent', gdprConsent: true })
    await record.refresh()
    assert.isNotNull(record.gdprConsentAt)

    await client
      .put(`/clients/${record.id}`)
      .loginAs(user)
      .form({ firstName: 'Toggle', lastName: 'Consent', gdprConsent: false })
    await record.refresh()
    assert.isNull(record.gdprConsentAt)
  })

  test('export returns a JSON attachment with client, reservations and documents', async ({
    client,
    assert,
  }) => {
    const user = await createEnterpriseAdminUser()
    const record = await Client.create({
      organizationId: user.organizationId!,
      firstName: 'Export',
      lastName: 'Me',
      email: 'export@example.com',
      status: 'active',
    })
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      clientId: record.id,
    }).create()
    await MediaFactory.merge({
      entityType: 'client',
      entityId: record.id,
      kind: 'document',
      originalFilename: 'permit.pdf',
    }).create()

    const response = await client.get(`/clients/${record.id}/export`).loginAs(user)

    response.assertStatus(200)
    response.assertHeader('content-type', 'application/json')
    const body = JSON.parse(response.text())
    assert.equal(body.client.email, 'export@example.com')
    assert.lengthOf(body.reservations, 1)
    assert.lengthOf(body.documents, 1)
    assert.equal(body.documents[0].originalFilename, 'permit.pdf')
    assert.property(body, 'exportedAt')
  })

  test('non-enterprise org is blocked from export', async ({ client }) => {
    const user = await createAdminUser() // 'pro' plan
    const response = await client.get('/clients/1/export').loginAs(user).redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/')
  })

  test('cannot export a client from another organization (IDOR)', async ({ client }) => {
    const user = await createEnterpriseAdminUser()
    const other = await createEnterpriseAdminUser()
    const foreign = await Client.create({
      organizationId: other.organizationId!,
      firstName: 'Foreign',
      lastName: 'Client',
      status: 'active',
    })

    const response = await client.get(`/clients/${foreign.id}/export`).loginAs(user).redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/clients')
  })
})
