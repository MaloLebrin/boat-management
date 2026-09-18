import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import Media from '#models/media'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { MediaFactory } from '#database/factories/media_factory'
import { createAdminUser, createMechanicUser, createMemberUser } from '#tests/functional/helpers'
import { restoreCloudinary, swapFakeCloudinary } from '#tests/support/fakes'

/**
 * Les deux téléchargements de média du domaine bateau, et la suppression d'un
 * média moteur (#692).
 *
 * L'enjeu n'est pas le code de statut : c'est l'en-tête. Les deux routes
 * construisent leur `Content-Disposition` à partir d'un **nom de fichier
 * fourni par l'utilisateur** à l'upload. `contentDisposition()`
 * (`shared/helpers/content_disposition.ts`) existe pour neutraliser le *header
 * splitting* que ça ouvre — il a un test unitaire, mais rien ne vérifiait que
 * ces routes-là l'appellent vraiment. Une interpolation brute réintroduite ici
 * passerait toute la suite au vert.
 *
 * ⚠️ `@japa/api-client` n'expose pas le corps binaire : tout se juge sur les
 * en-têtes, et sur ce que le fake Cloudinary a vu passer.
 */

/** Nom de fichier hostile : CRLF (header splitting), guillemet, antislash, accents. */
const HOSTILE_FILENAME = 'rapport"\r\nX-Injected: 1\\été'

async function seedBoatMedia(overrides: Partial<Media> = {}) {
  const user = await createAdminUser()
  const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
  const media = await MediaFactory.merge({
    entityType: 'boat',
    entityId: boat.id,
    kind: 'document',
    format: 'pdf',
    originalFilename: 'manuel',
    uploadedById: user.id,
    ...overrides,
  }).create()

  return { user, boat, media }
}

async function seedEngineMedia(overrides: Partial<Media> = {}) {
  const user = await createAdminUser()
  const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
  const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
  const media = await MediaFactory.merge({
    entityType: 'boat_engine',
    entityId: engine.id,
    kind: 'document',
    format: 'pdf',
    originalFilename: 'manuel-moteur',
    uploadedById: user.id,
    ...overrides,
  }).create()

  return { user, boat, engine, media }
}

test.group('Boat media download — GET /boats/:boatId/media/:mediaId/download', (group) => {
  group.each.setup(() => truncateDb())
  group.each.teardown(() => restoreCloudinary())

  test('sert le média avec son Content-Disposition, et télécharge le bon publicId', async ({
    client,
    assert,
  }) => {
    const cloud = swapFakeCloudinary()
    const { user, boat, media } = await seedBoatMedia()

    const response = await client.get(`/boats/${boat.id}/media/${media.id}/download`).loginAs(user)

    response.assertStatus(200)
    response.assertHeader('content-type', 'application/pdf')
    assert.equal(
      response.header('content-disposition'),
      `attachment; filename="manuel.pdf"; filename*=UTF-8''manuel.pdf`
    )

    // Le statut seul ne dit pas **quel** média a été servi : un scoping cassé
    // renverrait 200 sur le document d'autrui.
    assert.deepEqual(cloud.downloaded, [
      { publicId: media.cloudinaryPublicId, resourceType: 'raw', format: 'pdf' },
    ])
  })

  test("une image passe en resourceType 'image', pas 'raw'", async ({ client, assert }) => {
    const cloud = swapFakeCloudinary({
      download: { buffer: Buffer.from('\xff\xd8\xff fake'), contentType: 'image/jpeg' },
    })
    const { user, boat, media } = await seedBoatMedia({
      kind: 'photo',
      format: 'jpg',
      originalFilename: 'coque',
    })

    const response = await client.get(`/boats/${boat.id}/media/${media.id}/download`).loginAs(user)

    response.assertStatus(200)
    response.assertHeader('content-type', 'image/jpeg')
    assert.deepEqual(cloud.downloaded, [
      { publicId: media.cloudinaryPublicId, resourceType: 'image', format: 'jpg' },
    ])
  })

  test("un nom de fichier hostile ne coupe pas l'en-tête", async ({ client, assert }) => {
    swapFakeCloudinary()
    const { user, boat, media } = await seedBoatMedia({ originalFilename: HOSTILE_FILENAME })

    const response = await client.get(`/boats/${boat.id}/media/${media.id}/download`).loginAs(user)

    response.assertStatus(200)
    const header = response.header('content-disposition')

    // La régression que garde `contentDisposition()` : un CR ou un LF dans
    // l'en-tête permettrait d'injecter un en-tête supplémentaire, voire un
    // corps de réponse.
    assert.notInclude(header, '\r')
    assert.notInclude(header, '\n')

    // Les caractères de contrôle, le guillemet et l'antislash sont neutralisés
    // dans `filename`…
    assert.include(header, 'filename="rapport___X-Injected: 1_été.pdf"')
    // …et le nom complet reste restituable via `filename*`, percent-encodé.
    assert.include(header, `filename*=UTF-8''${encodeURIComponent(`${HOSTILE_FILENAME}.pdf`)}`)

    // Aucun en-tête parasite n'a été créé par l'injection.
    assert.isUndefined(response.headers()['x-injected'])
  })

  test("un média d'un autre bateau de la même organisation n'est pas servi", async ({
    client,
    assert,
  }) => {
    const cloud = swapFakeCloudinary()
    const { user, media } = await seedBoatMedia()
    const otherBoat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .get(`/boats/${otherBoat.id}/media/${media.id}/download`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/boats/${otherBoat.id}`)
    assert.isEmpty(cloud.downloaded)
  })

  test("un média d'une autre organisation n'est pas servi", async ({ client, assert }) => {
    const cloud = swapFakeCloudinary()
    const { boat, media } = await seedBoatMedia()
    const attacker = await createAdminUser()

    const response = await client
      .get(`/boats/${boat.id}/media/${media.id}/download`)
      .loginAs(attacker)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/boats')
    assert.isEmpty(cloud.downloaded)
  })

  test('la route exige une session', async ({ client, assert }) => {
    const cloud = swapFakeCloudinary()
    const { boat, media } = await seedBoatMedia()

    const response = await client.get(`/boats/${boat.id}/media/${media.id}/download`).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
    assert.isEmpty(cloud.downloaded)
  })

  test("un mechanic de l'organisation télécharge — la route n'a aucun bouncer", async ({
    client,
    assert,
  }) => {
    const cloud = swapFakeCloudinary()
    const { user, boat, media } = await seedBoatMedia()
    const mechanic = await createMechanicUser(user.organizationId!)

    const response = await client
      .get(`/boats/${boat.id}/media/${media.id}/download`)
      .loginAs(mechanic)

    // Contraste délibéré avec la suppression, qui exige `boats.edit` : le
    // téléchargement ne demande que l'appartenance à l'organisation. Ce n'est
    // pas une faille — c'est un écart d'autorisation entre deux routes
    // voisines, figé ici pour qu'un durcissement futur soit un choix et non
    // une surprise.
    response.assertStatus(200)
    assert.lengthOf(cloud.downloaded, 1)
  })
})

test.group(
  'Engine media download — GET /boats/:boatId/engines/:engineId/media/:mediaId/download',
  (group) => {
    group.each.setup(() => truncateDb())
    group.each.teardown(() => restoreCloudinary())

    test('sert le média du moteur avec son Content-Disposition', async ({ client, assert }) => {
      const cloud = swapFakeCloudinary()
      const { user, boat, engine, media } = await seedEngineMedia()

      const response = await client
        .get(`/boats/${boat.id}/engines/${engine.id}/media/${media.id}/download`)
        .loginAs(user)

      response.assertStatus(200)
      response.assertHeader('content-type', 'application/pdf')
      assert.equal(
        response.header('content-disposition'),
        `attachment; filename="manuel-moteur.pdf"; filename*=UTF-8''manuel-moteur.pdf`
      )
      assert.deepEqual(cloud.downloaded, [
        { publicId: media.cloudinaryPublicId, resourceType: 'raw', format: 'pdf' },
      ])
    })

    test("un nom de fichier hostile ne coupe pas l'en-tête", async ({ client, assert }) => {
      swapFakeCloudinary()
      const { user, boat, engine, media } = await seedEngineMedia({
        originalFilename: HOSTILE_FILENAME,
      })

      const response = await client
        .get(`/boats/${boat.id}/engines/${engine.id}/media/${media.id}/download`)
        .loginAs(user)

      response.assertStatus(200)
      const header = response.header('content-disposition')

      assert.notInclude(header, '\r')
      assert.notInclude(header, '\n')
      assert.include(header, 'filename="rapport___X-Injected: 1_été.pdf"')
      assert.isUndefined(response.headers()['x-injected'])
    })

    test("un moteur rattaché à un autre bateau n'est pas servi", async ({ client, assert }) => {
      const cloud = swapFakeCloudinary()
      const { user, engine, media } = await seedEngineMedia()
      const otherBoat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

      const response = await client
        .get(`/boats/${otherBoat.id}/engines/${engine.id}/media/${media.id}/download`)
        .loginAs(user)
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', `/boats/${otherBoat.id}`)
      assert.isEmpty(cloud.downloaded)
    })

    test("un média rattaché à un autre moteur n'est pas servi", async ({ client, assert }) => {
      const cloud = swapFakeCloudinary()
      const { user, boat, media } = await seedEngineMedia()
      const otherEngine = await BoatEngineFactory.merge({ boatId: boat.id }).create()

      const response = await client
        .get(`/boats/${boat.id}/engines/${otherEngine.id}/media/${media.id}/download`)
        .loginAs(user)
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', `/boats/${boat.id}/engines/${otherEngine.id}?tab=documents`)
      assert.isEmpty(cloud.downloaded)
    })

    test("un média d'une autre organisation n'est pas servi", async ({ client, assert }) => {
      const cloud = swapFakeCloudinary()
      const { boat, engine, media } = await seedEngineMedia()
      const attacker = await createAdminUser()

      const response = await client
        .get(`/boats/${boat.id}/engines/${engine.id}/media/${media.id}/download`)
        .loginAs(attacker)
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', '/boats')
      assert.isEmpty(cloud.downloaded)
    })
  }
)

test.group(
  'Engine media delete — DELETE /boats/:boatId/engines/:engineId/media/:mediaId',
  (group) => {
    group.each.setup(() => truncateDb())
    group.each.teardown(() => restoreCloudinary())

    test('supprime la ligne et libère le fichier chez Cloudinary', async ({ client, assert }) => {
      const cloud = swapFakeCloudinary()
      const { user, boat, engine, media } = await seedEngineMedia()

      const response = await client
        .delete(`/boats/${boat.id}/engines/${engine.id}/media/${media.id}`)
        .loginAs(user)
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', `/boats/${boat.id}/engines/${engine.id}?tab=documents`)

      assert.isNull(await Media.find(media.id))
      assert.deepEqual(cloud.deletedPublicIds, [media.cloudinaryPublicId])
    })

    test("un média d'une autre organisation survit, et rien n'est supprimé chez Cloudinary", async ({
      client,
      assert,
    }) => {
      const cloud = swapFakeCloudinary()
      const { boat, engine, media } = await seedEngineMedia()
      const attacker = await createAdminUser()

      const response = await client
        .delete(`/boats/${boat.id}/engines/${engine.id}/media/${media.id}`)
        .loginAs(attacker)
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', '/boats')

      assert.isNotNull(await Media.find(media.id))
      assert.isEmpty(cloud.deletedPublicIds)
    })

    test('un média rattaché à un autre moteur survit', async ({ client, assert }) => {
      const cloud = swapFakeCloudinary()
      const { user, boat, media } = await seedEngineMedia()
      const otherEngine = await BoatEngineFactory.merge({ boatId: boat.id }).create()

      const response = await client
        .delete(`/boats/${boat.id}/engines/${otherEngine.id}/media/${media.id}`)
        .loginAs(user)
        .redirects(0)

      response.assertStatus(302)
      assert.isNotNull(await Media.find(media.id))
      assert.isEmpty(cloud.deletedPublicIds)
    })

    test('un mechanic est refusé — la suppression exige boats.edit', async ({ client, assert }) => {
      const cloud = swapFakeCloudinary()
      const { user, boat, engine, media } = await seedEngineMedia()
      const mechanic = await createMechanicUser(user.organizationId!)

      const response = await client
        .delete(`/boats/${boat.id}/engines/${engine.id}/media/${media.id}`)
        .loginAs(mechanic)
        .redirects(0)

      response.assertStatus(302)
      assert.isNotNull(await Media.find(media.id))
      assert.isEmpty(cloud.deletedPublicIds)
    })

    test('un member de la même organisation peut supprimer', async ({ client, assert }) => {
      const cloud = swapFakeCloudinary()
      const { user, boat, engine, media } = await seedEngineMedia()
      const member = await createMemberUser(user.organizationId!)

      const response = await client
        .delete(`/boats/${boat.id}/engines/${engine.id}/media/${media.id}`)
        .loginAs(member)
        .redirects(0)

      response.assertStatus(302)
      assert.isNull(await Media.find(media.id))
      assert.deepEqual(cloud.deletedPublicIds, [media.cloudinaryPublicId])
    })

    test('la route exige une session', async ({ client, assert }) => {
      const cloud = swapFakeCloudinary()
      const { boat, engine, media } = await seedEngineMedia()

      const response = await client
        .delete(`/boats/${boat.id}/engines/${engine.id}/media/${media.id}`)
        .redirects(0)

      response.assertStatus(302)
      response.assertHeader('location', '/login')

      assert.isNotNull(await Media.find(media.id))
      assert.isEmpty(cloud.deletedPublicIds)
    })
  }
)
