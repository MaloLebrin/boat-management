import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatIncidentFactory } from '#database/factories/boat_incident_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import BoatInspection from '#models/boat_inspection'
import Media from '#models/media'
import { UPLOAD_PHOTOS_ACTION } from '#shared/constants/offline_queue'
import { createAdminUser, createCharterAdminUser } from '#tests/functional/helpers'
import { restoreCloudinary, swapFakeCloudinary } from '#tests/support/fakes'
import { truncateDb } from '#tests/utils/db'

/**
 * Rejeu des photos prises hors-ligne (#969).
 *
 * La file rejoue le lot comme la galerie l'envoie en ligne : `router.post` +
 * `forceFormData`, chaque fichier sous `files[]` (format `brackets` d'Inertia),
 * réduit en JPEG avant la mise en file. Un refus métier rendu en redirection
 * doit porter `rejectedType`, sinon `drainQueue` y lit un succès et détruit les
 * photos avec l'action.
 */

/** Octets d'un JPEG réduit par la file : `photo.png` est parti en `photo.jpg`. */
function compressedJpeg(label: string) {
  return Buffer.from(`\xff\xd8\xff\xe0 compressed ${label}`, 'binary')
}

const JPEG = { contentType: 'image/jpeg' }

test.group('File hors-ligne — rejeu multipart des photos (#969)', (group) => {
  group.each.setup(() => truncateDb())
  group.each.teardown(() => restoreCloudinary())

  test('un lot rejoué est enregistré tel quel, sans marqueur de refus', async ({
    client,
    assert,
  }) => {
    const fake = swapFakeCloudinary()
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/photos`)
      .loginAs(user)
      .file('files[]', compressedJpeg('a'), { ...JPEG, filename: 'avarie.jpg' })
      .file('files[]', compressedJpeg('b'), { ...JPEG, filename: 'coque.jpg' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMissing('rejectedType')
    assert.lengthOf(fake.uploaded, 2)
    const media = await Media.query().where('entityType', 'boat').where('entityId', boat.id)
    assert.lengthOf(media, 2)
    assert.isTrue(media.every((row) => row.kind === 'photo'))
  })

  test('un lot dont une partie échoue reste un succès : rien à garder en file', async ({
    client,
  }) => {
    swapFakeCloudinary({ failUploadAt: 2 })
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/photos`)
      .loginAs(user)
      .file('files[]', compressedJpeg('a'), { ...JPEG, filename: 'a.jpg' })
      .file('files[]', compressedJpeg('b'), { ...JPEG, filename: 'b.jpg' })
      .redirects(0)

    response.assertFlashMissing('rejectedType')
  })

  test('galerie du bateau : un lot entièrement refusé porte son marqueur', async ({ client }) => {
    swapFakeCloudinary({ failUploadAt: 1 })
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/photos`)
      .loginAs(user)
      .file('files[]', compressedJpeg('a'), { ...JPEG, filename: 'a.jpg' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('rejectedType', UPLOAD_PHOTOS_ACTION)
    response.assertFlashMessage('error')
  })

  test('galerie d’un équipement : refus du lot et équipement disparu portent le marqueur', async ({
    client,
  }) => {
    swapFakeCloudinary({ failUploadAt: 1 })
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()

    const refused = await client
      .post(`/boats/${boat.id}/engines/${engine.id}/photos`)
      .loginAs(user)
      .file('files[]', compressedJpeg('a'), { ...JPEG, filename: 'a.jpg' })
      .redirects(0)
    refused.assertFlashMessage('rejectedType', UPLOAD_PHOTOS_ACTION)

    // Moteur supprimé depuis le quai pendant la traversée.
    const gone = await client
      .post(`/boats/${boat.id}/engines/999999/photos`)
      .loginAs(user)
      .file('files[]', compressedJpeg('b'), { ...JPEG, filename: 'b.jpg' })
      .redirects(0)
    gone.assertStatus(302)
    gone.assertFlashMessage('rejectedType', UPLOAD_PHOTOS_ACTION)
  })

  test('photos d’un incident : refus du lot et incident disparu portent le marqueur', async ({
    client,
  }) => {
    swapFakeCloudinary({ failUploadAt: 1 })
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const incident = await BoatIncidentFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    const refused = await client
      .post(`/boats/${boat.id}/incidents/${incident.id}/photos`)
      .loginAs(user)
      .file('files[]', compressedJpeg('a'), { ...JPEG, filename: 'a.jpg' })
      .redirects(0)
    refused.assertFlashMessage('rejectedType', UPLOAD_PHOTOS_ACTION)

    const gone = await client
      .post(`/boats/${boat.id}/incidents/999999/photos`)
      .loginAs(user)
      .file('files[]', compressedJpeg('b'), { ...JPEG, filename: 'b.jpg' })
      .redirects(0)
    gone.assertStatus(302)
    gone.assertFlashMessage('rejectedType', UPLOAD_PHOTOS_ACTION)
  })

  test('photos d’un état des lieux signé entre-temps : refusées avec le marqueur', async ({
    client,
    assert,
  }) => {
    const fake = swapFakeCloudinary()
    const user = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()
    const inspection = await BoatInspection.create({
      reservationId: reservation.id,
      organizationId: boat.organizationId,
      kind: 'checkout',
      performedAt: DateTime.utc(),
      lockedAt: DateTime.utc(),
    })

    const response = await client
      .post(`/boats/${boat.id}/reservations/${reservation.id}/inspections/${inspection.id}/photos`)
      .loginAs(user)
      .file('files[]', compressedJpeg('a'), { ...JPEG, filename: 'a.jpg' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('rejectedType', UPLOAD_PHOTOS_ACTION)
    assert.lengthOf(fake.uploaded, 0)
  })
})
