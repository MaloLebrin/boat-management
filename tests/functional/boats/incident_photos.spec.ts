import { test } from '@japa/runner'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatIncidentFactory } from '#database/factories/boat_incident_factory'
import { MediaFactory } from '#database/factories/media_factory'
import Media from '#models/media'
import BoatIncident from '#models/boat_incident'
import { truncateDb } from '#tests/utils/db'
import { restoreCloudinary, swapFakeCloudinary } from '#tests/support/fakes'
import { assertPageContract } from '#tests/support/inertia_page'
import { createAdminUser, createMechanicUser, createMemberUser } from '#tests/functional/helpers'

/**
 * Photos d'un incident (#814) : mêmes deux gardes IDOR que les photos
 * d'équipement — l'incident doit être du bateau, le média doit être de cet
 * incident — mais autorisation par `IncidentPolicy.edit`, pas `BoatPolicy`.
 */

function photoBuffer() {
  return Buffer.from('\xff\xd8\xff\xe0 fake jpeg', 'binary')
}

async function adminWithIncident() {
  const admin = await createAdminUser()
  const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
  const incident = await BoatIncidentFactory.merge({
    boatId: boat.id,
    organizationId: boat.organizationId,
  }).create()
  return { admin, boat, incident }
}

test.group('Incident photos — page de détail (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('redirige vers /login sans authentification', async ({ client }) => {
    const response = await client.get('/boats/1/incidents/1').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('rend boats/incident_show avec ses photos et ses droits', async ({ client, assert }) => {
    const { admin, boat, incident } = await adminWithIncident()
    await MediaFactory.merge({
      entityType: 'boat_incident',
      entityId: incident.id,
      kind: 'photo',
    }).create()

    const response = await client
      .get(`/boats/${boat.id}/incidents/${incident.id}`)
      .loginAs(admin)
      .withInertia()

    assertPageContract(assert, response, 'boats/incident_show')
    const props = response.inertiaProps as { photos: unknown[]; canManage: boolean }
    assert.lengthOf(props.photos, 1)
    assert.isTrue(props.canManage)
  })

  test("un incident d'un autre bateau renvoie vers l'onglet Incidents", async ({ client }) => {
    const { admin, boat } = await adminWithIncident()
    const otherBoat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const foreign = await BoatIncidentFactory.merge({
      boatId: otherBoat.id,
      organizationId: otherBoat.organizationId,
    }).create()

    const response = await client
      .get(`/boats/${boat.id}/incidents/${foreign.id}`)
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}?tab=incidents`)
  })
})

test.group('Incident photos — upload et suppression (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test("un membre (incidents.edit) joint une photo, rangée dans le dossier de l'incident", async ({
    client,
    assert,
  }) => {
    const fake = swapFakeCloudinary()
    try {
      const { admin, boat, incident } = await adminWithIncident()
      const member = await createMemberUser(admin.organizationId!)

      const response = await client
        .post(`/boats/${boat.id}/incidents/${incident.id}/photos`)
        .loginAs(member)
        .file('files[]', photoBuffer(), { filename: 'photo.jpg', contentType: 'image/jpeg' })
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', `/boats/${boat.id}/incidents/${incident.id}`)

      const media = await Media.query()
        .where('entityType', 'boat_incident')
        .where('entityId', incident.id)
        .firstOrFail()
      assert.equal(media.kind, 'photo')
      assert.lengthOf(fake.uploaded, 1)
      assert.match(fake.uploadedFolders[0], new RegExp(`/incidents/${incident.id}/photos$`))
    } finally {
      restoreCloudinary()
    }
  })

  test('un mécanicien est refusé, rien n’est envoyé', async ({ client, assert }) => {
    const fake = swapFakeCloudinary()
    try {
      const { admin, boat, incident } = await adminWithIncident()
      const mechanic = await createMechanicUser(admin.organizationId!)

      const response = await client
        .post(`/boats/${boat.id}/incidents/${incident.id}/photos`)
        .loginAs(mechanic)
        .file('files[]', photoBuffer(), { filename: 'photo.jpg', contentType: 'image/jpeg' })
        .redirects(0)

      assert.notEqual(response.status(), 200)
      assert.lengthOf(fake.uploaded, 0)
      assert.lengthOf(await Media.query().where('entityType', 'boat_incident'), 0)
    } finally {
      restoreCloudinary()
    }
  })

  test("l'incident d'un autre bateau est refusé sans rien créer", async ({ client, assert }) => {
    const fake = swapFakeCloudinary()
    try {
      const { admin, boat } = await adminWithIncident()
      const otherBoat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
      const foreign = await BoatIncidentFactory.merge({
        boatId: otherBoat.id,
        organizationId: otherBoat.organizationId,
      }).create()

      const response = await client
        .post(`/boats/${boat.id}/incidents/${foreign.id}/photos`)
        .loginAs(admin)
        .file('files[]', photoBuffer(), { filename: 'photo.jpg', contentType: 'image/jpeg' })
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', `/boats/${boat.id}?tab=incidents`)
      assert.lengthOf(fake.uploaded, 0)
      assert.lengthOf(await Media.query().where('entityType', 'boat_incident'), 0)
    } finally {
      restoreCloudinary()
    }
  })

  test("un média d'un autre incident n'est pas supprimable par cette URL", async ({
    client,
    assert,
  }) => {
    swapFakeCloudinary()
    try {
      const { admin, boat, incident } = await adminWithIncident()
      const other = await BoatIncidentFactory.merge({
        boatId: boat.id,
        organizationId: boat.organizationId,
      }).create()
      const victim = await MediaFactory.merge({
        entityType: 'boat_incident',
        entityId: other.id,
        kind: 'photo',
      }).create()

      const response = await client
        .delete(`/boats/${boat.id}/incidents/${incident.id}/photos/${victim.id}`)
        .loginAs(admin)
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', `/boats/${boat.id}/incidents/${incident.id}`)
      assert.isNotNull(await Media.find(victim.id))
    } finally {
      restoreCloudinary()
    }
  })

  test('supprimer une photo de son incident, puis l’incident purge ses médias', async ({
    client,
    assert,
  }) => {
    swapFakeCloudinary()
    try {
      const { admin, boat, incident } = await adminWithIncident()
      const first = await MediaFactory.merge({
        entityType: 'boat_incident',
        entityId: incident.id,
        kind: 'photo',
      }).create()
      const second = await MediaFactory.merge({
        entityType: 'boat_incident',
        entityId: incident.id,
        kind: 'photo',
      }).create()

      const deletion = await client
        .delete(`/boats/${boat.id}/incidents/${incident.id}/photos/${first.id}`)
        .loginAs(admin)
        .redirects(0)
      deletion.assertFlashMessage('success', 'File deleted.')
      assert.isNull(await Media.find(first.id))
      assert.isNotNull(await Media.find(second.id))

      await client.delete(`/boats/${boat.id}/incidents/${incident.id}`).loginAs(admin)
      assert.isNull(await BoatIncident.find(incident.id))
      assert.isNull(await Media.find(second.id))
    } finally {
      restoreCloudinary()
    }
  })
})
