import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { MediaFactory } from '#database/factories/media_factory'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser, createMemberUser } from '#tests/functional/helpers'
import { CloudinaryService } from '#services/cloudinary_service'
import BoatInspection from '#models/boat_inspection'
import Media from '#models/media'

const VALID_INSPECTION = {
  kind: 'checkout',
  performedAt: '2025-08-01T10:00',
  fuelLevel: 80,
  engineHours: 120.5,
  notes: 'RAS',
}

test.group('Boat Inspections (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  // --- show ---

  test('GET .../inspection renders the page for an authorized user', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    const response = await client
      .get(`/boats/${boat.id}/reservations/${reservation.id}/inspection`)
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    response.assertInertiaComponent('boats/reservation_inspection')
  })

  test('GET .../inspection redirects to /login when unauthenticated', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    const response = await client
      .get(`/boats/${boat.id}/reservations/${reservation.id}/inspection`)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('GET .../inspection redirects to /boats when boat not found', async ({ client }) => {
    const user = await createAdminUser()

    const response = await client
      .get('/boats/999999/reservations/1/inspection')
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
  })

  test('GET .../inspection redirects to reservations index when reservation not found', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .get(`/boats/${boat.id}/reservations/999999/inspection`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}/reservations`)
  })

  test('GET .../inspection rejects cross-org attempt', async ({ client }) => {
    const owner = await createAdminUser()
    const other = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    const response = await client
      .get(`/boats/${boat.id}/reservations/${reservation.id}/inspection`)
      .loginAs(other)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
  })

  // --- store ---

  test('POST .../inspections creates a checkout inspection', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    const response = await client
      .post(`/boats/${boat.id}/reservations/${reservation.id}/inspections`)
      .form(VALID_INSPECTION)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const inspections = await BoatInspection.query().where('reservationId', reservation.id)
    assert.lengthOf(inspections, 1)
    assert.equal(inspections[0].kind, 'checkout')
    assert.equal(inspections[0].fuelLevel, 80)
    assert.equal(inspections[0].notes, 'RAS')
  })

  test('POST .../inspections allows non-admin same-org member to create', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    const response = await client
      .post(`/boats/${boat.id}/reservations/${reservation.id}/inspections`)
      .form(VALID_INSPECTION)
      .loginAs(member)
      .redirects(0)

    response.assertStatus(302)

    const inspections = await BoatInspection.query().where('reservationId', reservation.id)
    assert.lengthOf(inspections, 1)
  })

  test('POST .../inspections flashes error when kind already exists for the reservation', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    await client
      .post(`/boats/${boat.id}/reservations/${reservation.id}/inspections`)
      .form(VALID_INSPECTION)
      .loginAs(user)

    const response = await client
      .post(`/boats/${boat.id}/reservations/${reservation.id}/inspections`)
      .form(VALID_INSPECTION)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const inspections = await BoatInspection.query().where('reservationId', reservation.id)
    assert.lengthOf(inspections, 1)
  })

  test('POST .../inspections rejects cross-org attempt', async ({ client, assert }) => {
    const owner = await createAdminUser()
    const other = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    const response = await client
      .post(`/boats/${boat.id}/reservations/${reservation.id}/inspections`)
      .form(VALID_INSPECTION)
      .loginAs(other)
      .redirects(0)

    response.assertStatus(302)

    const inspections = await BoatInspection.query().where('reservationId', reservation.id)
    assert.lengthOf(inspections, 0)
  })

  // --- update ---

  test('PUT .../inspections/:id updates fields', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    await client
      .post(`/boats/${boat.id}/reservations/${reservation.id}/inspections`)
      .form(VALID_INSPECTION)
      .loginAs(user)

    const inspection = await BoatInspection.query()
      .where('reservationId', reservation.id)
      .firstOrFail()

    const response = await client
      .put(`/boats/${boat.id}/reservations/${reservation.id}/inspections/${inspection.id}`)
      .form({ fuelLevel: 50, notes: 'Updated' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    await inspection.refresh()
    assert.equal(inspection.fuelLevel, 50)
    assert.equal(inspection.notes, 'Updated')
  })

  test('PUT .../inspections/:id preserves optional fields on partial update', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    await client
      .post(`/boats/${boat.id}/reservations/${reservation.id}/inspections`)
      .form(VALID_INSPECTION)
      .loginAs(user)

    const inspection = await BoatInspection.query()
      .where('reservationId', reservation.id)
      .firstOrFail()

    const response = await client
      .put(`/boats/${boat.id}/reservations/${reservation.id}/inspections/${inspection.id}`)
      .form({ fuelLevel: 60 })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    await inspection.refresh()
    assert.equal(inspection.fuelLevel, 60)
    assert.equal(inspection.notes, 'RAS')
  })

  test('PUT .../inspections/:id returns 302 when inspection not found', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    const response = await client
      .put(`/boats/${boat.id}/reservations/${reservation.id}/inspections/999999`)
      .form({ fuelLevel: 50 })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
  })

  // --- destroy ---

  test('DELETE .../inspections/:id is rejected for non-admin member', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    await client
      .post(`/boats/${boat.id}/reservations/${reservation.id}/inspections`)
      .form(VALID_INSPECTION)
      .loginAs(admin)

    const inspection = await BoatInspection.query()
      .where('reservationId', reservation.id)
      .firstOrFail()

    const response = await client
      .delete(`/boats/${boat.id}/reservations/${reservation.id}/inspections/${inspection.id}`)
      .loginAs(member)
      .redirects(0)

    response.assertStatus(302)

    const existing = await BoatInspection.find(inspection.id)
    assert.isNotNull(existing)
  })

  test('DELETE .../inspections/:id allows admin to delete', async ({ client, assert }) => {
    const admin = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    await client
      .post(`/boats/${boat.id}/reservations/${reservation.id}/inspections`)
      .form(VALID_INSPECTION)
      .loginAs(admin)

    const inspection = await BoatInspection.query()
      .where('reservationId', reservation.id)
      .firstOrFail()

    const response = await client
      .delete(`/boats/${boat.id}/reservations/${reservation.id}/inspections/${inspection.id}`)
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)

    const existing = await BoatInspection.find(inspection.id)
    assert.isNull(existing)
  })

  test('DELETE .../inspections/:id deletes its associated photos', async ({ client, assert }) => {
    const deletedFolders: string[] = []
    app.container.swap(
      CloudinaryService,
      () =>
        ({
          deleteFolder: async (folderPath: string) => {
            deletedFolders.push(folderPath)
          },
        }) as unknown as CloudinaryService
    )

    try {
      const admin = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
      const reservation = await BoatReservationFactory.merge({
        boatId: boat.id,
        organizationId: boat.organizationId,
      }).create()

      await client
        .post(`/boats/${boat.id}/reservations/${reservation.id}/inspections`)
        .form(VALID_INSPECTION)
        .loginAs(admin)

      const inspection = await BoatInspection.query()
        .where('reservationId', reservation.id)
        .firstOrFail()

      const media = await MediaFactory.merge({
        entityType: 'inspection',
        entityId: inspection.id,
      }).create()

      const response = await client
        .delete(`/boats/${boat.id}/reservations/${reservation.id}/inspections/${inspection.id}`)
        .loginAs(admin)
        .redirects(0)

      response.assertStatus(302)

      const existingInspection = await BoatInspection.find(inspection.id)
      assert.isNull(existingInspection)

      const existingMedia = await Media.find(media.id)
      assert.isNull(existingMedia)
      assert.lengthOf(deletedFolders, 1)
      assert.include(deletedFolders[0], `reservations/${reservation.id}/inspections/checkout`)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  // --- validators ---

  test('POST .../inspections rejects a non-integer fuelLevel', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    const response = await client
      .post(`/boats/${boat.id}/reservations/${reservation.id}/inspections`)
      .form({ ...VALID_INSPECTION, fuelLevel: 55.5 })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const inspections = await BoatInspection.query().where('reservationId', reservation.id)
    assert.lengthOf(inspections, 0)
  })

  test('POST .../inspections rejects engineHours above the decimal(6,2) bound', async ({
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
      .post(`/boats/${boat.id}/reservations/${reservation.id}/inspections`)
      .form({ ...VALID_INSPECTION, engineHours: 100000 })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)

    const inspections = await BoatInspection.query().where('reservationId', reservation.id)
    assert.lengthOf(inspections, 0)
  })

  // --- photos ---

  test('DELETE .../inspections/:id/photos/:mediaId is rejected for non-admin member', async ({
    client,
    assert,
  }) => {
    const admin = await createAdminUser()
    const member = await createMemberUser(admin.organizationId!)
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()
    const inspection = await BoatInspection.create({
      reservationId: reservation.id,
      organizationId: boat.organizationId,
      kind: 'checkout',
      performedAt: reservation.startsAt,
      fuelLevel: 80,
      engineHours: null,
      notes: null,
    })
    const media = await MediaFactory.merge({
      entityType: 'inspection',
      entityId: inspection.id,
    }).create()

    const response = await client
      .delete(
        `/boats/${boat.id}/reservations/${reservation.id}/inspections/${inspection.id}/photos/${media.id}`
      )
      .loginAs(member)
      .redirects(0)

    response.assertStatus(302)

    const existing = await Media.find(media.id)
    assert.isNotNull(existing)
  })

  test('DELETE .../inspections/:id/photos/:mediaId allows admin to delete the photo', async ({
    client,
    assert,
  }) => {
    const deletedPublicIds: string[] = []
    app.container.swap(
      CloudinaryService,
      () =>
        ({
          deleteFile: async (publicId: string) => {
            deletedPublicIds.push(publicId)
          },
        }) as unknown as CloudinaryService
    )

    try {
      const admin = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
      const reservation = await BoatReservationFactory.merge({
        boatId: boat.id,
        organizationId: boat.organizationId,
      }).create()
      const inspection = await BoatInspection.create({
        reservationId: reservation.id,
        organizationId: boat.organizationId,
        kind: 'checkout',
        performedAt: reservation.startsAt,
        fuelLevel: 80,
        engineHours: null,
        notes: null,
      })
      const media = await MediaFactory.merge({
        entityType: 'inspection',
        entityId: inspection.id,
      }).create()

      const response = await client
        .delete(
          `/boats/${boat.id}/reservations/${reservation.id}/inspections/${inspection.id}/photos/${media.id}`
        )
        .loginAs(admin)
        .redirects(0)

      response.assertStatus(302)

      const existing = await Media.find(media.id)
      assert.isNull(existing)
      assert.deepEqual(deletedPublicIds, [media.cloudinaryPublicId])
    } finally {
      app.container.restore(CloudinaryService)
    }
  })
})
