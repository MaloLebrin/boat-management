import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'
import mail from '@adonisjs/mail/services/main'
import i18nManager from '@adonisjs/i18n/services/main'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'
import RentalContract from '#models/rental_contract'
import Organization from '#models/organization'
import RentalContractPdfService from '#services/rental_contract_pdf_service'
import { CloudinaryService } from '#services/cloudinary_service'
import Media from '#models/media'
import OrganizationMembership from '#models/organization_membership'

async function createMemberUser(organizationId: number) {
  const member = await UserFactory.merge({ organizationId }).create()
  await OrganizationMembership.create({ userId: member.id, organizationId, role: 'member' })
  return member
}

function swapFakeCloudinaryUpload() {
  const uploadedPublicIds: string[] = []
  const deletedPublicIds: string[] = []
  app.container.swap(
    CloudinaryService,
    () =>
      ({
        uploadDocument: async () => {
          const publicId = `fake-public-id-${uploadedPublicIds.length}`
          uploadedPublicIds.push(publicId)
          return {
            publicId,
            url: `http://res.cloudinary.com/${publicId}.pdf`,
            secureUrl: `https://res.cloudinary.com/${publicId}.pdf`,
            format: 'pdf',
            resourceType: 'raw',
            bytes: 1234,
            originalFilename: 'signed-contract',
          }
        },
        deleteFile: async (publicId: string) => {
          deletedPublicIds.push(publicId)
        },
        deleteFolder: async () => {},
        downloadAsBuffer: async () => ({
          buffer: Buffer.from('%PDF-1.4 fake'),
          contentType: 'application/pdf',
        }),
      }) as unknown as CloudinaryService
  )
  return { uploadedPublicIds, deletedPublicIds }
}

test.group('Rental contracts (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())
  group.each.setup(() => {
    mail.fake()
  })
  group.each.teardown(() => mail.restore())

  // --- show ---

  test('GET .../contract renders the page with no contract yet', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    const response = await client
      .get(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('boats/reservation_contract')
    response.assertInertiaPropsContains({ contract: null })
  })

  test('GET .../contract redirects to /login when unauthenticated', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    const response = await client
      .get(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('GET .../contract rejects cross-org attempt', async ({ client }) => {
    const owner = await createAdminUser()
    const other = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    const response = await client
      .get(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
      .loginAs(other)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
  })

  // --- store ---

  test('POST .../contract creates a draft contract with the reservation client snapshot', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    const response = await client
      .post(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const contract = await RentalContract.query()
      .where('reservationId', reservation.id)
      .firstOrFail()
    assert.equal(contract.status, 'draft')
    assert.equal(contract.organizationId, boat.organizationId)
  })

  test('POST .../contract flashes an error when a contract already exists', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    await client.post(`/boats/${boat.id}/reservations/${reservation.id}/contract`).loginAs(user)

    const response = await client
      .post(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const contracts = await RentalContract.query().where('reservationId', reservation.id)
    assert.lengthOf(contracts, 1)
  })

  test('POST .../contract rejects cross-org attempt', async ({ client, assert }) => {
    const owner = await createAdminUser()
    const other = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    const response = await client
      .post(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
      .loginAs(other)
      .redirects(0)

    response.assertStatus(302)

    const contracts = await RentalContract.query().where('reservationId', reservation.id)
    assert.lengthOf(contracts, 0)
  })

  // --- pdf ---

  test('RentalContractPdfService generates a valid PDF buffer', async ({ assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()
    const contract = await RentalContract.create({
      organizationId: boat.organizationId,
      reservationId: reservation.id,
      clientId: null,
      status: 'draft',
    })
    await contract.load('reservation', (q) => q.preload('boat'))

    const org = await Organization.findOrFail(boat.organizationId)
    const service = await app.container.make(RentalContractPdfService)
    const { buffer, filename } = await service.generate(contract, org, i18nManager.locale('fr'))

    assert.isTrue(Buffer.isBuffer(buffer))
    assert.equal(buffer.subarray(0, 4).toString('ascii'), '%PDF')
    assert.isTrue(filename.endsWith('.pdf'))
  })

  test('GET .../contract/pdf downloads a PDF once a contract exists', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    await client.post(`/boats/${boat.id}/reservations/${reservation.id}/contract`).loginAs(user)

    const response = await client
      .get(`/boats/${boat.id}/reservations/${reservation.id}/contract/pdf`)
      .loginAs(user)

    response.assertStatus(200)
    response.assertHeader('content-type', 'application/pdf')
    assert.isAbove(Number(response.header('content-length')), 500)
  })

  test('GET .../contract/pdf redirects with a flash when no contract exists', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    const response = await client
      .get(`/boats/${boat.id}/reservations/${reservation.id}/contract/pdf`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Contract not found.')
  })

  // --- send ---

  test('POST .../contract/send transitions draft to sent', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      clientEmail: 'client@example.com',
    }).create()

    await client.post(`/boats/${boat.id}/reservations/${reservation.id}/contract`).loginAs(user)

    const response = await client
      .post(`/boats/${boat.id}/reservations/${reservation.id}/contract/send`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('success', 'Contract sent by email.')

    const contract = await RentalContract.query()
      .where('reservationId', reservation.id)
      .firstOrFail()
    assert.equal(contract.status, 'sent')
  })

  test('POST .../contract/send does not send a second email on an invalid transition', async ({
    client,
    assert,
  }) => {
    const { messages } = mail.fake()

    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      clientEmail: 'client@example.com',
    }).create()

    await client.post(`/boats/${boat.id}/reservations/${reservation.id}/contract`).loginAs(user)
    await client
      .post(`/boats/${boat.id}/reservations/${reservation.id}/contract/send`)
      .loginAs(user)

    messages.assertSentCount(1)

    const response = await client
      .post(`/boats/${boat.id}/reservations/${reservation.id}/contract/send`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'This status change is not allowed.')

    const contract = await RentalContract.query()
      .where('reservationId', reservation.id)
      .firstOrFail()
    assert.equal(contract.status, 'sent')
    messages.assertSentCount(1)
  })

  test('POST .../contract/send refuses when the client has no email', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
      clientEmail: null,
    }).create()

    await client.post(`/boats/${boat.id}/reservations/${reservation.id}/contract`).loginAs(user)

    const response = await client
      .post(`/boats/${boat.id}/reservations/${reservation.id}/contract/send`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'This client does not have an email address.')

    const contract = await RentalContract.query()
      .where('reservationId', reservation.id)
      .firstOrFail()
    assert.equal(contract.status, 'draft')
  })

  // --- sign (signed document upload) ---

  test('POST .../contract/sign refuses to sign a draft contract', async ({ client, assert }) => {
    swapFakeCloudinaryUpload()
    try {
      const user = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
      const reservation = await BoatReservationFactory.merge({
        boatId: boat.id,
        organizationId: boat.organizationId,
      }).create()

      await client.post(`/boats/${boat.id}/reservations/${reservation.id}/contract`).loginAs(user)

      const response = await client
        .post(`/boats/${boat.id}/reservations/${reservation.id}/contract/sign`)
        .loginAs(user)
        .file('file', Buffer.from('%PDF-1.4 fake'), {
          filename: 'signed.pdf',
          contentType: 'application/pdf',
        })
        .redirects(0)

      response.assertStatus(302)
      response.assertFlashMessage('error', 'This status change is not allowed.')

      const contract = await RentalContract.query()
        .where('reservationId', reservation.id)
        .firstOrFail()
      assert.equal(contract.status, 'draft')
      assert.isNull(contract.mediaId)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('POST .../contract/sign uploads the signed document and marks the contract as signed', async ({
    client,
    assert,
  }) => {
    swapFakeCloudinaryUpload()
    try {
      const user = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
      const reservation = await BoatReservationFactory.merge({
        boatId: boat.id,
        organizationId: boat.organizationId,
        clientEmail: 'client@example.com',
      }).create()

      await client.post(`/boats/${boat.id}/reservations/${reservation.id}/contract`).loginAs(user)
      await client
        .post(`/boats/${boat.id}/reservations/${reservation.id}/contract/send`)
        .loginAs(user)

      const response = await client
        .post(`/boats/${boat.id}/reservations/${reservation.id}/contract/sign`)
        .loginAs(user)
        .file('file', Buffer.from('%PDF-1.4 fake'), {
          filename: 'signed.pdf',
          contentType: 'application/pdf',
        })
        .redirects(0)

      response.assertStatus(302)
      response.assertFlashMessage('success', 'Contract marked as signed.')

      const contract = await RentalContract.query()
        .where('reservationId', reservation.id)
        .firstOrFail()
      assert.equal(contract.status, 'signed')
      assert.isNotNull(contract.signedAt)
      assert.isNotNull(contract.mediaId)

      const media = await Media.findOrFail(contract.mediaId!)
      assert.equal(media.entityType, 'rentalContract')
      assert.equal(media.entityId, contract.id)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  // --- signed document download ---

  test('GET .../contract/signed-document streams the signed file once uploaded', async ({
    client,
    assert,
  }) => {
    swapFakeCloudinaryUpload()
    try {
      const user = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
      const reservation = await BoatReservationFactory.merge({
        boatId: boat.id,
        organizationId: boat.organizationId,
        clientEmail: 'client@example.com',
      }).create()

      await client.post(`/boats/${boat.id}/reservations/${reservation.id}/contract`).loginAs(user)
      await client
        .post(`/boats/${boat.id}/reservations/${reservation.id}/contract/send`)
        .loginAs(user)
      await client
        .post(`/boats/${boat.id}/reservations/${reservation.id}/contract/sign`)
        .loginAs(user)
        .file('file', Buffer.from('%PDF-1.4 fake'), {
          filename: 'signed.pdf',
          contentType: 'application/pdf',
        })

      const response = await client
        .get(`/boats/${boat.id}/reservations/${reservation.id}/contract/signed-document`)
        .loginAs(user)

      response.assertStatus(200)
      response.assertHeader('content-type', 'application/pdf')
      assert.include(response.header('content-disposition'), 'attachment')
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('GET .../contract/signed-document redirects with a flash when no signed document exists', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    await client.post(`/boats/${boat.id}/reservations/${reservation.id}/contract`).loginAs(user)

    const response = await client
      .get(`/boats/${boat.id}/reservations/${reservation.id}/contract/signed-document`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Contract not found.')
  })

  test('POST .../contract/sign replaces a previously uploaded signed document', async ({
    client,
    assert,
  }) => {
    const { deletedPublicIds } = swapFakeCloudinaryUpload()
    try {
      const user = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
      const reservation = await BoatReservationFactory.merge({
        boatId: boat.id,
        organizationId: boat.organizationId,
        clientEmail: 'client@example.com',
      }).create()

      await client.post(`/boats/${boat.id}/reservations/${reservation.id}/contract`).loginAs(user)
      await client
        .post(`/boats/${boat.id}/reservations/${reservation.id}/contract/send`)
        .loginAs(user)
      await client
        .post(`/boats/${boat.id}/reservations/${reservation.id}/contract/sign`)
        .loginAs(user)
        .file('file', Buffer.from('%PDF-1.4 first'), {
          filename: 'signed-1.pdf',
          contentType: 'application/pdf',
        })

      const firstContract = await RentalContract.query()
        .where('reservationId', reservation.id)
        .firstOrFail()
      const firstMediaId = firstContract.mediaId

      const response = await client
        .post(`/boats/${boat.id}/reservations/${reservation.id}/contract/sign`)
        .loginAs(user)
        .file('file', Buffer.from('%PDF-1.4 second'), {
          filename: 'signed-2.pdf',
          contentType: 'application/pdf',
        })
        .redirects(0)

      response.assertStatus(302)

      const contract = await RentalContract.query()
        .where('reservationId', reservation.id)
        .firstOrFail()
      assert.notEqual(contract.mediaId, firstMediaId)
      assert.isNull(await Media.find(firstMediaId!))
      assert.lengthOf(deletedPublicIds, 1)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  // --- destroy ---

  test('DELETE .../contract is rejected for a non-admin member', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    await client.post(`/boats/${boat.id}/reservations/${reservation.id}/contract`).loginAs(admin)

    const response = await client
      .delete(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
      .loginAs(member)
      .redirects(0)

    response.assertStatus(302)

    const existing = await RentalContract.query().where('reservationId', reservation.id).first()
    assert.isNotNull(existing)
  })

  test('DELETE .../contract allows an admin to delete', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    await client.post(`/boats/${boat.id}/reservations/${reservation.id}/contract`).loginAs(admin)

    const response = await client
      .delete(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)

    const existing = await RentalContract.query().where('reservationId', reservation.id).first()
    assert.isNull(existing)
  })

  test('DELETE .../contract also deletes the uploaded signed document', async ({
    client,
    assert,
  }) => {
    const { deletedPublicIds } = swapFakeCloudinaryUpload()
    try {
      const admin = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
      const reservation = await BoatReservationFactory.merge({
        boatId: boat.id,
        organizationId: boat.organizationId,
        clientEmail: 'client@example.com',
      }).create()

      await client.post(`/boats/${boat.id}/reservations/${reservation.id}/contract`).loginAs(admin)
      await client
        .post(`/boats/${boat.id}/reservations/${reservation.id}/contract/send`)
        .loginAs(admin)
      await client
        .post(`/boats/${boat.id}/reservations/${reservation.id}/contract/sign`)
        .loginAs(admin)
        .file('file', Buffer.from('%PDF-1.4 fake'), {
          filename: 'signed.pdf',
          contentType: 'application/pdf',
        })

      const contract = await RentalContract.query()
        .where('reservationId', reservation.id)
        .firstOrFail()
      const mediaId = contract.mediaId!

      const response = await client
        .delete(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
        .loginAs(admin)
        .redirects(0)

      response.assertStatus(302)
      assert.isNull(await Media.find(mediaId))
      assert.lengthOf(deletedPublicIds, 1)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })
})
