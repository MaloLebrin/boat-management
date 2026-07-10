import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { MediaFactory } from '#database/factories/media_factory'
import { createAdminUser } from '#tests/functional/helpers'
import Media from '#models/media'
import { CloudinaryService } from '#services/cloudinary_service'

function swapFakeCloudinary() {
  const uploaded: string[] = []
  app.container.swap(
    CloudinaryService,
    () =>
      ({
        uploadImage: async () => {
          const publicId = `fake-boat-photo-${uploaded.length}`
          uploaded.push(publicId)
          return {
            publicId,
            url: `http://res.cloudinary.com/${publicId}.jpg`,
            secureUrl: `https://res.cloudinary.com/${publicId}.jpg`,
            format: 'jpg',
            resourceType: 'image',
            bytes: 1024,
            originalFilename: 'photo',
            width: 800,
            height: 600,
          }
        },
        uploadDocument: async () => {
          const publicId = `fake-boat-doc-${uploaded.length}`
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
        deleteFile: async () => {},
        deleteFolder: async () => {},
      }) as unknown as CloudinaryService
  )
  return { uploaded }
}

test.group('Boat Media — DELETE (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('DELETE /boats/:boatId/media/:mediaId supprime le media du bateau', async ({
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
      const media = await MediaFactory.merge({
        entityType: 'boat',
        entityId: boat.id,
        uploadedById: user.id,
      }).create()

      const response = await client
        .delete(`/boats/${boat.id}/media/${media.id}`)
        .loginAs(user)
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', `/boats/${boat.id}`)

      const found = await Media.find(media.id)
      assert.isNull(found)
      assert.deepEqual(deletedPublicIds, [media.cloudinaryPublicId])
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('DELETE /boats/:boatId/media/:mediaId — IDOR : ne peut pas supprimer le media appartenant à un autre bateau', async ({
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

      const victimMedia = await MediaFactory.merge({
        entityType: 'boat',
        entityId: victimBoat.id,
        uploadedById: victim.id,
      }).create()

      // Attacker tente de supprimer un media d'un autre bateau en passant l'ID dans sa propre route
      const response = await client
        .delete(`/boats/${attackerBoat.id}/media/${victimMedia.id}`)
        .loginAs(attacker)
        .redirects(0)

      response.assertStatus(302)
      // Redirige vers le bateau de l'attaquant (media introuvable pour cette entité)
      response.assertHeader('location', `/boats/${attackerBoat.id}`)

      // Le media de la victime est intact
      const found = await Media.find(victimMedia.id)
      assert.isNotNull(found)
      assert.isEmpty(deletedPublicIds)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('DELETE /boats/:boatId/media/:mediaId redirige vers /login si non authentifié', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const media = await MediaFactory.merge({
      entityType: 'boat',
      entityId: boat.id,
    }).create()

    const response = await client.delete(`/boats/${boat.id}/media/${media.id}`).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('DELETE /boats/:boatId/media/:mediaId — PDF supprimé avec resourceType raw', async ({
    client,
    assert,
  }) => {
    const deletedCalls: { publicId: string; resourceType: string }[] = []
    app.container.swap(
      CloudinaryService,
      () =>
        ({
          deleteFile: async (publicId: string, resourceType: 'image' | 'raw' = 'image') => {
            deletedCalls.push({ publicId, resourceType })
          },
        }) as unknown as CloudinaryService
    )

    try {
      const user = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
      const media = await MediaFactory.merge({
        entityType: 'boat',
        entityId: boat.id,
        uploadedById: user.id,
        kind: 'document',
        format: 'pdf',
      }).create()

      const response = await client
        .delete(`/boats/${boat.id}/media/${media.id}`)
        .loginAs(user)
        .redirects(0)

      response.assertStatus(302)

      const found = await Media.find(media.id)
      assert.isNull(found)
      assert.lengthOf(deletedCalls, 1)
      assert.equal(deletedCalls[0].publicId, media.cloudinaryPublicId)
      assert.equal(deletedCalls[0].resourceType, 'raw')
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('DELETE /boats/:boatId/media/:mediaId retourne 302 sur media inexistant', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .delete(`/boats/${boat.id}/media/999999`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}`)

    const mediaCount = await Media.query()
      .where('entityId', boat.id)
      .where('entityType', 'boat')
      .count('* as count')
    assert.equal(Number(mediaCount[0].$extras.count), 0)
  })
})

test.group('Boat Media — POST photos (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST /boats/:boatId/photos attaches a single photo', async ({ client, assert }) => {
    const fake = swapFakeCloudinary()
    try {
      const user = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

      const response = await client
        .post(`/boats/${boat.id}/photos`)
        .loginAs(user)
        .file('files[]', Buffer.from('\xff\xd8\xff\xe0 fake jpeg', 'binary'), {
          filename: 'photo.jpg',
          contentType: 'image/jpeg',
        })
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', `/boats/${boat.id}?tab=overview`)

      const medias = await Media.query().where('entityType', 'boat').where('entityId', boat.id)
      assert.lengthOf(medias, 1)
      assert.equal(medias[0].kind, 'photo')
      assert.lengthOf(fake.uploaded, 1)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('POST /boats/:boatId/photos attaches multiple photos in one request', async ({
    client,
    assert,
  }) => {
    const fake = swapFakeCloudinary()
    try {
      const user = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

      const response = await client
        .post(`/boats/${boat.id}/photos`)
        .loginAs(user)
        .file('files[]', Buffer.from('\xff\xd8\xff\xe0 fake jpeg 1', 'binary'), {
          filename: 'photo-1.jpg',
          contentType: 'image/jpeg',
        })
        .file('files[]', Buffer.from('\xff\xd8\xff\xe0 fake jpeg 2', 'binary'), {
          filename: 'photo-2.jpg',
          contentType: 'image/jpeg',
        })
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', `/boats/${boat.id}?tab=overview`)

      const medias = await Media.query().where('entityType', 'boat').where('entityId', boat.id)
      assert.lengthOf(medias, 2)
      assert.lengthOf(fake.uploaded, 2)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('POST /boats/:boatId/photos redirects to /login when unauthenticated', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/photos`)
      .file('files[]', Buffer.from('\xff\xd8\xff\xe0 fake jpeg', 'binary'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })
})

test.group('Boat Media — POST documents (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST /boats/:boatId/documents attaches multiple documents in one request', async ({
    client,
    assert,
  }) => {
    const fake = swapFakeCloudinary()
    try {
      const user = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

      const response = await client
        .post(`/boats/${boat.id}/documents`)
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
      response.assertHeader('location', `/boats/${boat.id}?tab=documents`)

      const medias = await Media.query().where('entityType', 'boat').where('entityId', boat.id)
      assert.lengthOf(medias, 2)
      assert.isTrue(medias.every((m) => m.kind === 'document'))
      assert.lengthOf(fake.uploaded, 2)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('POST /boats/:boatId/engines/:engineId/documents attaches multiple documents in one request', async ({
    client,
    assert,
  }) => {
    const fake = swapFakeCloudinary()
    try {
      const user = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
      const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()

      const response = await client
        .post(`/boats/${boat.id}/engines/${engine.id}/documents`)
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
      response.assertHeader('location', `/boats/${boat.id}/engines/${engine.id}?tab=documents`)

      const medias = await Media.query()
        .where('entityType', 'boat_engine')
        .where('entityId', engine.id)
      assert.lengthOf(medias, 2)
      assert.lengthOf(fake.uploaded, 2)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })
})
