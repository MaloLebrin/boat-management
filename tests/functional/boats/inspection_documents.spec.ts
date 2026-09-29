import { test } from '@japa/runner'
import mail from '@adonisjs/mail/services/main'
import { DateTime } from 'luxon'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import { createCharterAdminUser, createMechanicUser } from '#tests/functional/helpers'
import { restoreCloudinary, swapFakeCloudinary } from '#tests/support/fakes'
import BoatEquipmentAction from '#models/boat_equipment_action'
import BoatInspection from '#models/boat_inspection'
import BoatInspectionItem from '#models/boat_inspection_item'
import BoatInspectionSignature from '#models/boat_inspection_signature'
import Media from '#models/media'
import type User from '#models/user'

/** PNG 1 × 1 transparent : un tracé minimal, mais un vrai PNG. */
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

async function setup(options: { clientEmail?: string | null } = {}) {
  const user = await createCharterAdminUser()
  const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
  const reservation = await BoatReservationFactory.merge({
    boatId: boat.id,
    organizationId: boat.organizationId,
    clientName: 'Alice Martin',
    clientEmail: options.clientEmail === undefined ? 'alice@example.com' : options.clientEmail,
  }).create()
  const inspection = await BoatInspection.create({
    reservationId: reservation.id,
    organizationId: boat.organizationId,
    kind: 'checkout',
    performedAt: DateTime.utc(),
    fuelLevel: 80,
  })
  await BoatInspectionItem.create({
    boatInspectionId: inspection.id,
    itemKey: 'hull_deck.hull_condition',
    state: 'damage',
    note: 'Rayure bâbord',
  })
  const base = `/boats/${boat.id}/reservations/${reservation.id}/inspections/${inspection.id}`
  return { user, boat, reservation, inspection, base }
}

const signPayload = {
  clientName: 'Alice Martin',
  clientSignature: PNG,
  staffSignature: PNG,
}

async function sign(client: any, user: User, base: string) {
  return client.post(`${base}/sign`).loginAs(user).json(signPayload).redirects(0)
}

test.group('Inspection documents — PDF, signature, envoi (#889)', (group) => {
  group.each.setup(() => truncateDb())
  group.each.setup(() => {
    mail.fake()
  })
  group.each.teardown(() => {
    mail.restore()
    restoreCloudinary()
  })

  // --- PDF ---

  test('GET pdf renders an unsigned draft on the fly', async ({ client, assert }) => {
    const cloud = swapFakeCloudinary()
    const { user, base, reservation } = await setup()

    const response = await client.get(`${base}/pdf`).loginAs(user)

    response.assertStatus(200)
    response.assertHeader('content-type', 'application/pdf')
    assert.include(response.header('content-disposition'), 'attachment')
    assert.include(response.header('content-disposition'), `etat-des-lieux-${reservation.id}`)
    assert.equal(Buffer.from(response.body()).subarray(0, 4).toString(), '%PDF')
    assert.lengthOf(cloud.downloaded, 0)
  })

  test('GET pdf?inline=1 opens the PDF in the browser', async ({ client, assert }) => {
    swapFakeCloudinary()
    const { user, base } = await setup()

    const response = await client.get(`${base}/pdf`).qs({ inline: '1' }).loginAs(user)

    response.assertStatus(200)
    assert.include(response.header('content-disposition'), 'inline')
  })

  test('GET pdf is forbidden to a mechanic', async ({ client }) => {
    swapFakeCloudinary()
    const { user, base } = await setup()
    const mechanic = await createMechanicUser(user.organizationId!)

    const response = await client.get(`${base}/pdf`).loginAs(mechanic)

    response.assertStatus(403)
  })

  test('GET pdf of another organization never serves the document', async ({ client, assert }) => {
    swapFakeCloudinary()
    const { base } = await setup()
    const outsider = await createCharterAdminUser()

    const response = await client.get(`${base}/pdf`).loginAs(outsider).redirects(0)

    assert.notEqual(response.status(), 200)
    assert.notEqual(response.header('content-type'), 'application/pdf')
  })

  // --- Signature ---

  test('POST sign stores both signatures, archives the PDF and locks', async ({
    client,
    assert,
  }) => {
    const cloud = swapFakeCloudinary()
    const { user, base, inspection } = await setup()

    const response = await sign(client, user, base)

    response.assertStatus(302)
    response.assertFlashMessage(
      'success',
      'Inspection signed. The signed PDF is archived on the reservation.'
    )

    await inspection.refresh()
    assert.isNotNull(inspection.lockedAt)
    assert.equal(inspection.lockedById, user.id)
    assert.isNotNull(inspection.pdfMediaId)

    const signatures = await BoatInspectionSignature.query()
      .where('boatInspectionId', inspection.id)
      .orderBy('role')
    assert.deepEqual(
      signatures.map((signature) => [signature.role, signature.signerName]),
      [
        ['client', 'Alice Martin'],
        ['staff', user.fullName!],
      ]
    )
    assert.equal(signatures[0].image.subarray(1, 4).toString(), 'PNG')

    assert.lengthOf(cloud.uploadedBuffers, 1)
    assert.equal(cloud.uploadedBuffers[0].buffer.subarray(0, 4).toString(), '%PDF')
    assert.match(cloud.uploadedBuffers[0].folder, /\/inspections\/checkout\/signed$/)

    const media = await Media.findOrFail(inspection.pdfMediaId)
    assert.equal(media.entityType, 'inspection')
    assert.equal(media.entityId, inspection.id)
    assert.equal(media.kind, 'document')
  })

  test('POST sign twice keeps the first signature', async ({ client, assert }) => {
    const cloud = swapFakeCloudinary()
    const { user, base, inspection } = await setup()

    await sign(client, user, base)
    const second = await sign(client, user, base)

    second.assertFlashMessage('error', 'This inspection is signed: it can no longer be changed.')
    const signatures = await BoatInspectionSignature.query().where(
      'boatInspectionId',
      inspection.id
    )
    assert.lengthOf(signatures, 2)
    assert.lengthOf(cloud.uploadedBuffers, 1)
  })

  test('POST sign rejects bytes that are not a PNG', async ({ client, assert }) => {
    const cloud = swapFakeCloudinary()
    const { user, base, inspection } = await setup()

    const response = await client
      .post(`${base}/sign`)
      .loginAs(user)
      .json({ ...signPayload, clientSignature: 'data:image/png;base64,aGVsbG8gd29ybGQ=' })
      .redirects(0)

    response.assertFlashMessage('error', 'Unreadable signature: clear it and sign again.')
    await inspection.refresh()
    assert.isNull(inspection.lockedAt)
    assert.lengthOf(cloud.uploadedBuffers, 0)
  })

  test('POST sign rejects a missing or non-PNG data URL', async ({ client, assert }) => {
    swapFakeCloudinary()
    const { user, base, inspection } = await setup()

    const response = await client
      .post(`${base}/sign`)
      .loginAs(user)
      .json({ clientName: 'Alice Martin', clientSignature: 'data:image/jpeg;base64,AAAA' })
      .redirects(0)

    response.assertStatus(302)
    const bag = response.flashMessages().inputErrorsBag as Record<string, unknown> | undefined
    assert.properties(bag ?? {}, ['clientSignature', 'staffSignature'])
    await inspection.refresh()
    assert.isNull(inspection.lockedAt)
  })

  test('POST sign is forbidden to a mechanic', async ({ client, assert }) => {
    swapFakeCloudinary()
    const { user, base, inspection } = await setup()
    const mechanic = await createMechanicUser(user.organizationId!)

    await client.post(`${base}/sign`).loginAs(mechanic).json(signPayload).redirects(0)

    await inspection.refresh()
    assert.isNull(inspection.lockedAt)
  })

  // --- Verrou ---

  test('a signed inspection refuses every change', async ({ client, assert }) => {
    swapFakeCloudinary()
    const { user, base, inspection } = await setup()
    await sign(client, user, base)
    const locked = 'This inspection is signed: it can no longer be changed.'

    const item = await client
      .patch(`${base}/items`)
      .loginAs(user)
      .form({ itemKey: 'hull_deck.hull_condition', state: 'ok' })
      .redirects(0)
    item.assertFlashMessage('error', locked)

    const cleared = await client
      .delete(`${base}/items`)
      .loginAs(user)
      .form({ itemKey: 'hull_deck.hull_condition' })
      .redirects(0)
    cleared.assertFlashMessage('error', locked)

    const updated = await client.put(base).loginAs(user).form({ fuelLevel: 10 }).redirects(0)
    updated.assertFlashMessage('error', locked)

    const deleted = await client.delete(base).loginAs(user).redirects(0)
    deleted.assertFlashMessage('error', locked)

    const defect = await client
      .post(`${base}/equipment-actions`)
      .loginAs(user)
      .form({ label: 'Hublot fêlé', actionType: 'to_repair' })
      .redirects(0)
    defect.assertFlashMessage('error', locked)

    const photo = await client
      .post(`${base}/photos`)
      .loginAs(user)
      .file('files', Buffer.from('fake'), { filename: 'hull.jpg' })
      .redirects(0)
    photo.assertFlashMessage('error', locked)

    await inspection.refresh()
    assert.equal(inspection.fuelLevel, 80)
    const items = await BoatInspectionItem.query().where('boatInspectionId', inspection.id)
    assert.lengthOf(items, 1)
    assert.equal(items[0].state, 'damage')
    assert.lengthOf(await BoatEquipmentAction.query().where('inspectionId', inspection.id), 0)
  })

  test('a defect of a signed inspection cannot be deleted from it', async ({ client, assert }) => {
    swapFakeCloudinary()
    const { user, boat, base, inspection } = await setup()
    const action = await BoatEquipmentAction.create({
      boatId: boat.id,
      organizationId: boat.organizationId,
      actionType: 'to_repair',
      status: 'pending',
      label: 'Hublot fêlé',
      inspectionId: inspection.id,
      createdBy: user.id,
    })
    await sign(client, user, base)

    const response = await client
      .delete(`${base}/equipment-actions/${action.id}`)
      .loginAs(user)
      .redirects(0)

    response.assertFlashMessage('error', 'This inspection is signed: it can no longer be changed.')
    assert.isNotNull(await BoatEquipmentAction.find(action.id))
  })

  test('GET pdf of a signed inspection serves the archived file', async ({ client, assert }) => {
    const cloud = swapFakeCloudinary()
    const { user, base, inspection } = await setup()
    await sign(client, user, base)
    await inspection.refresh()
    const media = await Media.findOrFail(inspection.pdfMediaId)

    const response = await client.get(`${base}/pdf`).loginAs(user)

    response.assertStatus(200)
    assert.deepEqual(cloud.downloaded, [
      { publicId: media.cloudinaryPublicId, resourceType: 'raw', format: media.format },
    ])
  })

  test('the inspection page lists signers without their drawing, and no PDF as photo', async ({
    client,
    assert,
  }) => {
    swapFakeCloudinary()
    const { user, boat, reservation, base } = await setup()
    await sign(client, user, base)

    const response = await client
      .get(`/boats/${boat.id}/reservations/${reservation.id}/inspection`)
      .loginAs(user)
      .withInertia()

    response.assertStatus(200)
    const [row] = response.inertiaProps.inspections as Array<Record<string, any>>
    assert.isNotNull(row.lockedAt)
    assert.lengthOf(row.photos, 0)
    assert.deepEqual(
      row.signatures.map((signature: Record<string, unknown>) => Object.keys(signature).sort()),
      [
        ['role', 'signedAt', 'signerName'],
        ['role', 'signedAt', 'signerName'],
      ]
    )
  })

  // --- Envoi ---

  test('POST send refuses an unsigned inspection', async ({ client }) => {
    const { messages } = mail.fake()
    swapFakeCloudinary()
    const { user, base } = await setup()

    const response = await client.post(`${base}/send`).loginAs(user).redirects(0)

    response.assertFlashMessage(
      'error',
      'Have the inspection signed first: only the signed PDF is sent to the client.'
    )
    messages.assertNoneSent()
  })

  test('POST send emails the signed PDF to the client', async ({ client, assert }) => {
    const { messages } = mail.fake()
    swapFakeCloudinary()
    const { user, base, inspection } = await setup()
    await sign(client, user, base)

    const response = await client.post(`${base}/send`).loginAs(user).redirects(0)

    response.assertFlashMessage('success', 'Inspection sent to alice@example.com.')
    messages.assertSentCount(1)
    messages.assertSent((message) => message.hasTo('alice@example.com'))
    const node = messages.sent()[0].toObject().message as {
      attachments?: Array<{ contentType?: string; filename?: string }>
    }
    const pdf = node.attachments?.find((attachment) => attachment.contentType === 'application/pdf')
    assert.match(pdf?.filename ?? '', /^etat-des-lieux-\d+-checkout\.pdf$/)

    await inspection.refresh()
    assert.isNotNull(inspection.sentAt)
  })

  test('POST send refuses when the client has no email', async ({ client, assert }) => {
    const { messages } = mail.fake()
    swapFakeCloudinary()
    const { user, base, inspection } = await setup({ clientEmail: null })
    await sign(client, user, base)

    const response = await client.post(`${base}/send`).loginAs(user).redirects(0)

    response.assertFlashMessage(
      'error',
      'No email address for this client: add one on the reservation.'
    )
    messages.assertNoneSent()
    await inspection.refresh()
    assert.isNull(inspection.sentAt)
  })
})
