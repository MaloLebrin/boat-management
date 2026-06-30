import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'
import { BoatFactory } from '#database/factories/boat_factory'
import { MediaFactory } from '#database/factories/media_factory'
import { createAdminUser } from '#tests/functional/helpers'
import Media from '#models/media'
import { CloudinaryService } from '#services/cloudinary_service'

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
