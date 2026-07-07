import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { MediaFactory } from '#database/factories/media_factory'
import { UserFactory } from '#database/factories/user_factory'
import Client from '#models/client'
import Media from '#models/media'
import OrganizationMembership from '#models/organization_membership'
import { createAdminUser } from '#tests/functional/helpers'
import { CloudinaryService } from '#services/cloudinary_service'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

async function createEnterpriseUser(role: 'admin' | 'member' = 'admin') {
  const user = await UserFactory.with('organization', 1, (org) =>
    org.merge({ plan: 'enterprise' })
  ).create()
  if (user.organizationId) {
    await OrganizationMembership.create({
      userId: user.id,
      organizationId: user.organizationId,
      role,
    })
  }
  return user
}

function swapFakeCloudinary() {
  const deletedFolders: string[] = []
  app.container.swap(
    CloudinaryService,
    () =>
      ({
        deleteFile: async () => {},
        deleteFolder: async (folder: string) => {
          deletedFolders.push(folder)
        },
      }) as unknown as CloudinaryService
  )
  return { deletedFolders }
}

test.group('Client anonymize (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('anonymizes PII, deletes documents and stamps anonymized_at', async ({ client, assert }) => {
    swapFakeCloudinary()
    try {
      const user = await createEnterpriseUser('admin')
      const record = await Client.create({
        organizationId: user.organizationId!,
        firstName: 'Alice',
        lastName: 'Martin',
        email: 'alice@example.com',
        phone: '+33100000000',
        address: '1 rue de la Mer',
        navigationPermitNumber: 'ABC123',
        navigationPermitType: 'coastal',
        notes: 'VIP',
        status: 'active',
      })
      await MediaFactory.merge({
        entityType: 'client',
        entityId: record.id,
        kind: 'document',
      }).create()

      const response = await client
        .post(`/clients/${record.id}/anonymize`)
        .loginAs(user)
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', '/clients')

      await record.refresh()
      assert.equal(record.firstName, 'Client')
      assert.equal(record.lastName, 'anonymisé')
      assert.isNull(record.email)
      assert.isNull(record.phone)
      assert.isNull(record.address)
      assert.isNull(record.navigationPermitNumber)
      assert.isNull(record.navigationPermitType)
      assert.isNull(record.notes)
      assert.isNotNull(record.anonymizedAt)

      const remainingDocs = await Media.query()
        .where('entityType', 'client')
        .where('entityId', record.id)
        .count('* as total')
      assert.equal(Number(remainingDocs[0].$extras.total), 0)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('keeps reservation link but anonymizes the text snapshot', async ({ client, assert }) => {
    swapFakeCloudinary()
    try {
      const user = await createEnterpriseUser('admin')
      const record = await Client.create({
        organizationId: user.organizationId!,
        firstName: 'Bob',
        lastName: 'Dylan',
        status: 'active',
      })
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
      const reservation = await BoatReservationFactory.merge({
        boatId: boat.id,
        organizationId: user.organizationId!,
        clientId: record.id,
        clientName: 'Bob Dylan',
        clientEmail: 'bob@example.com',
        clientPhone: '+33111111111',
      }).create()

      const response = await client
        .post(`/clients/${record.id}/anonymize`)
        .loginAs(user)
        .redirects(0)
      response.assertStatus(302)

      await reservation.refresh()
      assert.equal(reservation.clientId, record.id) // FK preserved
      assert.equal(reservation.clientName, 'Client anonymisé')
      assert.isNull(reservation.clientEmail)
      assert.isNull(reservation.clientPhone)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('is idempotent (second call is a no-op)', async ({ client, assert }) => {
    swapFakeCloudinary()
    try {
      const user = await createEnterpriseUser('admin')
      const record = await Client.create({
        organizationId: user.organizationId!,
        firstName: 'Carla',
        lastName: 'Bruni',
        status: 'active',
      })

      await client.post(`/clients/${record.id}/anonymize`).loginAs(user).redirects(0)
      await record.refresh()
      const firstAnonymizedAt = record.anonymizedAt?.toISO()

      const second = await client.post(`/clients/${record.id}/anonymize`).loginAs(user).redirects(0)
      second.assertStatus(302)

      await record.refresh()
      assert.equal(record.anonymizedAt?.toISO(), firstAnonymizedAt)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('blocks editing an anonymized client', async ({ client, assert }) => {
    swapFakeCloudinary()
    try {
      const user = await createEnterpriseUser('admin')
      const record = await Client.create({
        organizationId: user.organizationId!,
        firstName: 'Denis',
        lastName: 'Brogniart',
        status: 'active',
      })
      await client.post(`/clients/${record.id}/anonymize`).loginAs(user).redirects(0)

      const response = await client
        .put(`/clients/${record.id}`)
        .loginAs(user)
        .form({ firstName: 'Re', lastName: 'Identified' })
        .redirects(0)

      response.assertStatus(302)

      await record.refresh()
      assert.equal(record.firstName, 'Client')
      assert.equal(record.lastName, 'anonymisé')
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('is admin-only (member cannot anonymize)', async ({ client, assert }) => {
    swapFakeCloudinary()
    try {
      const user = await createEnterpriseUser('member')
      const record = await Client.create({
        organizationId: user.organizationId!,
        firstName: 'Emma',
        lastName: 'Watson',
        status: 'active',
      })

      await client.post(`/clients/${record.id}/anonymize`).loginAs(user).redirects(0)

      await record.refresh()
      assert.isNull(record.anonymizedAt)
      assert.equal(record.firstName, 'Emma')
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('cannot anonymize a client from another organization (IDOR)', async ({ client, assert }) => {
    swapFakeCloudinary()
    try {
      const user = await createEnterpriseUser('admin')
      const other = await createEnterpriseUser('admin')
      const foreign = await Client.create({
        organizationId: other.organizationId!,
        firstName: 'Foreign',
        lastName: 'Client',
        status: 'active',
      })

      await client.post(`/clients/${foreign.id}/anonymize`).loginAs(user).redirects(0)

      await foreign.refresh()
      assert.isNull(foreign.anonymizedAt)
      assert.equal(foreign.firstName, 'Foreign')
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('non-enterprise org is blocked from anonymize', async ({ client }) => {
    const user = await createAdminUser() // 'pro' plan
    const response = await client.post('/clients/1/anonymize').loginAs(user).redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/')
  })

  test('unauthenticated user is redirected to login', async ({ client }) => {
    const response = await client.post('/clients/1/anonymize').redirects(0)
    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('BoatReservation snapshot untouched for other clients', async ({ client, assert }) => {
    swapFakeCloudinary()
    try {
      const user = await createEnterpriseUser('admin')
      const target = await Client.create({
        organizationId: user.organizationId!,
        firstName: 'Target',
        lastName: 'Client',
        status: 'active',
      })
      const bystander = await Client.create({
        organizationId: user.organizationId!,
        firstName: 'By',
        lastName: 'Stander',
        status: 'active',
      })
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
      const bystanderReservation = await BoatReservationFactory.merge({
        boatId: boat.id,
        organizationId: user.organizationId!,
        clientId: bystander.id,
        clientName: 'By Stander',
      }).create()

      await client.post(`/clients/${target.id}/anonymize`).loginAs(user).redirects(0)

      await bystanderReservation.refresh()
      assert.equal(bystanderReservation.clientName, 'By Stander')
    } finally {
      app.container.restore(CloudinaryService)
    }
  })
})
