import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { BoatEnginePartFactory } from '#database/factories/boat_engine_part_factory'
import { MediaFactory } from '#database/factories/media_factory'
import { createAdminUser } from '#tests/functional/helpers'
import Media from '#models/media'
import { CloudinaryService } from '#services/cloudinary_service'

test.group('BoatEngineParts — destroyMedia (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('DELETE supprime le media de la pièce moteur', async ({ client, assert }) => {
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
      const user = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
      const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
      const part = await BoatEnginePartFactory.merge({ boatEngineId: engine.id }).create()
      const media = await MediaFactory.merge({
        entityType: 'boat_engine_part',
        entityId: part.id,
        uploadedById: user.id,
        kind: 'document',
      }).create()

      const response = await client
        .delete(`/boats/${boat.id}/engines/${engine.id}/parts/${part.id}/media/${media.id}`)
        .loginAs(user)
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader(
        'location',
        `/boats/${boat.id}/engines/${engine.id}/parts/${part.id}?tab=documents`
      )

      const found = await Media.find(media.id)
      assert.isNull(found)
      assert.deepEqual(deletedPublicIds, [media.cloudinaryPublicId])
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('DELETE — IDOR : engineId appartenant à un autre bateau est rejeté', async ({
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
      const victim = await createAdminUser()
      const attacker = await createAdminUser()

      const victimBoat = await BoatFactory.merge({
        organizationId: victim.organizationId!,
      }).create()
      const attackerBoat = await BoatFactory.merge({
        organizationId: attacker.organizationId!,
      }).create()

      const victimEngine = await BoatEngineFactory.merge({ boatId: victimBoat.id }).create()
      const victimPart = await BoatEnginePartFactory.merge({
        boatEngineId: victimEngine.id,
      }).create()
      const victimMedia = await MediaFactory.merge({
        entityType: 'boat_engine_part',
        entityId: victimPart.id,
        uploadedById: victim.id,
        kind: 'document',
      }).create()

      // L'attaquant forge l'URL avec son propre bateau mais l'engine/part/media de la victime
      const response = await client
        .delete(
          `/boats/${attackerBoat.id}/engines/${victimEngine.id}/parts/${victimPart.id}/media/${victimMedia.id}`
        )
        .loginAs(attacker)
        .redirects(0)

      response.assertStatus(302)
      // Redirigé vers le bateau de l'attaquant car l'engine n'appartient pas à ce bateau
      response.assertHeader('location', `/boats/${attackerBoat.id}`)

      const found = await Media.find(victimMedia.id)
      assert.isNotNull(found)
      assert.isEmpty(deletedPublicIds)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('DELETE — IDOR : partId appartenant à un autre engine est rejeté', async ({
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
      const user = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

      const engine1 = await BoatEngineFactory.merge({ boatId: boat.id }).create()
      const engine2 = await BoatEngineFactory.merge({ boatId: boat.id }).create()

      // La part appartient à engine2, pas à engine1
      const part = await BoatEnginePartFactory.merge({ boatEngineId: engine2.id }).create()
      const media = await MediaFactory.merge({
        entityType: 'boat_engine_part',
        entityId: part.id,
        uploadedById: user.id,
        kind: 'document',
      }).create()

      // L'attaquant utilise engine1 dans l'URL mais la part appartient à engine2
      const response = await client
        .delete(`/boats/${boat.id}/engines/${engine1.id}/parts/${part.id}/media/${media.id}`)
        .loginAs(user)
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', `/boats/${boat.id}/engines/${engine1.id}?tab=parts`)

      const found = await Media.find(media.id)
      assert.isNotNull(found)
      assert.isEmpty(deletedPublicIds)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('DELETE redirige vers /login si non authentifié', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    const part = await BoatEnginePartFactory.merge({ boatEngineId: engine.id }).create()

    const response = await client
      .delete(`/boats/${boat.id}/engines/${engine.id}/parts/${part.id}/media/999`)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})

test.group('BoatEngineParts — downloadMedia (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET — IDOR : engineId appartenant à un autre bateau est rejeté', async ({
    client,
    assert,
  }) => {
    const victim = await createAdminUser()
    const attacker = await createAdminUser()

    const victimBoat = await BoatFactory.merge({ organizationId: victim.organizationId! }).create()
    const attackerBoat = await BoatFactory.merge({
      organizationId: attacker.organizationId!,
    }).create()

    const victimEngine = await BoatEngineFactory.merge({ boatId: victimBoat.id }).create()
    const victimPart = await BoatEnginePartFactory.merge({ boatEngineId: victimEngine.id }).create()
    const victimMedia = await MediaFactory.merge({
      entityType: 'boat_engine_part',
      entityId: victimPart.id,
      uploadedById: victim.id,
      kind: 'document',
      format: 'pdf',
    }).create()

    const response = await client
      .get(
        `/boats/${attackerBoat.id}/engines/${victimEngine.id}/parts/${victimPart.id}/media/${victimMedia.id}/download`
      )
      .loginAs(attacker)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${attackerBoat.id}`)

    // Le fichier n'a pas été téléchargé (pas de buffer retourné)
    assert.notEqual(response.headers()['content-type'], 'application/pdf')
  })

  test('GET — IDOR : partId appartenant à un autre engine est rejeté', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const engine1 = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    const engine2 = await BoatEngineFactory.merge({ boatId: boat.id }).create()

    const part = await BoatEnginePartFactory.merge({ boatEngineId: engine2.id }).create()
    const media = await MediaFactory.merge({
      entityType: 'boat_engine_part',
      entityId: part.id,
      uploadedById: user.id,
      kind: 'document',
      format: 'pdf',
    }).create()

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine1.id}/parts/${part.id}/media/${media.id}/download`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}/engines/${engine1.id}?tab=parts`)

    assert.notEqual(response.headers()['content-type'], 'application/pdf')
  })

  test('GET redirige vers /login si non authentifié', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    const part = await BoatEnginePartFactory.merge({ boatEngineId: engine.id }).create()

    const response = await client
      .get(`/boats/${boat.id}/engines/${engine.id}/parts/${part.id}/media/999/download`)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})

test.group('BoatEngineParts — storeDocument (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST attaches multiple documents to the engine part in one request', async ({
    client,
    assert,
  }) => {
    const uploaded: string[] = []
    app.container.swap(
      CloudinaryService,
      () =>
        ({
          uploadDocument: async () => {
            const publicId = `fake-part-doc-${uploaded.length}`
            uploaded.push(publicId)
            return {
              publicId,
              url: `http://res.cloudinary.com/${publicId}.pdf`,
              secureUrl: `https://res.cloudinary.com/${publicId}.pdf`,
              format: 'pdf',
              resourceType: 'raw',
              bytes: 2048,
              originalFilename: 'doc',
            }
          },
        }) as unknown as CloudinaryService
    )

    try {
      const user = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
      const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
      const part = await BoatEnginePartFactory.merge({ boatEngineId: engine.id }).create()

      const response = await client
        .post(`/boats/${boat.id}/engines/${engine.id}/parts/${part.id}/documents`)
        .loginAs(user)
        .file('files[]', Buffer.from('%PDF-1.4 first'), {
          filename: 'doc-1.pdf',
          contentType: 'application/pdf',
        })
        .file('files[]', Buffer.from('%PDF-1.4 second'), {
          filename: 'doc-2.pdf',
          contentType: 'application/pdf',
        })
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader(
        'location',
        `/boats/${boat.id}/engines/${engine.id}/parts/${part.id}?tab=documents`
      )

      const medias = await Media.query()
        .where('entityType', 'boat_engine_part')
        .where('entityId', part.id)
      assert.lengthOf(medias, 2)
      assert.lengthOf(uploaded, 2)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('POST redirige vers /login si non authentifié', async ({ client }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
    const part = await BoatEnginePartFactory.merge({ boatEngineId: engine.id }).create()

    const response = await client
      .post(`/boats/${boat.id}/engines/${engine.id}/parts/${part.id}/documents`)
      .file('files[]', Buffer.from('%PDF-1.4 fake'), {
        filename: 'doc.pdf',
        contentType: 'application/pdf',
      })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})
