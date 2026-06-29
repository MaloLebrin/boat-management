import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import app from '@adonisjs/core/services/app'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatDocumentFactory } from '#database/factories/boat_document_factory'
import { MediaFactory } from '#database/factories/media_factory'
import { UserFactory } from '#database/factories/user_factory'
import { createAdminUser } from '#tests/functional/helpers'
import BoatDocument from '#models/boat_document'
import Media from '#models/media'
import { CloudinaryService } from '#services/cloudinary_service'

test.group('Boat Documents — DELETE (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('DELETE /boats/:boatId/admin-documents/:documentId supprime le document sans media', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const doc = await BoatDocumentFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
    }).create()

    const response = await client
      .delete(`/boats/${boat.id}/admin-documents/${doc.id}`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}?tab=admin-docs`)

    const found = await BoatDocument.find(doc.id)
    assert.isNull(found)
  })

  test('DELETE /boats/:boatId/admin-documents/:documentId supprime le document et le media associé', async ({
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
          deleteFolder: async () => {},
        }) as unknown as CloudinaryService
    )

    try {
      const user = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
      const media = await MediaFactory.merge({
        entityType: 'boat',
        entityId: boat.id,
      }).create()
      const doc = await BoatDocumentFactory.merge({
        boatId: boat.id,
        organizationId: user.organizationId!,
        mediaId: media.id,
      }).create()

      const response = await client
        .delete(`/boats/${boat.id}/admin-documents/${doc.id}`)
        .loginAs(user)
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', `/boats/${boat.id}?tab=admin-docs`)

      const foundDoc = await BoatDocument.find(doc.id)
      assert.isNull(foundDoc)

      const foundMedia = await Media.find(media.id)
      assert.isNull(foundMedia)

      assert.lengthOf(deletedPublicIds, 1)
      assert.equal(deletedPublicIds[0], media.cloudinaryPublicId)
    } finally {
      app.container.restore(CloudinaryService)
    }
  })

  test('DELETE /boats/:boatId/admin-documents/:documentId retourne 302 sur document inexistant', async ({
    client,
    assert,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .delete(`/boats/${boat.id}/admin-documents/999999`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${boat.id}?tab=admin-docs`)

    const docCount = await BoatDocument.query().where('boatId', boat.id).count('* as count')
    assert.equal(Number(docCount[0].$extras.count), 0)
  })

  test('DELETE /boats/:boatId/admin-documents/:documentId redirige vers /login si non authentifié', async ({
    client,
  }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const doc = await BoatDocumentFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
    }).create()

    const response = await client.delete(`/boats/${boat.id}/admin-documents/${doc.id}`).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test("DELETE /boats/:boatId/admin-documents/:documentId ne supprime pas le document d'une autre org", async ({
    client,
    assert,
  }) => {
    const owner = await createAdminUser()
    const other = await UserFactory.with('organization').create()
    const boat = await BoatFactory.merge({ organizationId: owner.organizationId! }).create()
    const doc = await BoatDocumentFactory.merge({
      boatId: boat.id,
      organizationId: owner.organizationId!,
    }).create()

    await client.delete(`/boats/${boat.id}/admin-documents/${doc.id}`).loginAs(other).redirects(0)

    const found = await BoatDocument.find(doc.id)
    assert.isNotNull(found)
  })
})
