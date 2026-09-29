import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import Media from '#models/media'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatEngineFactory } from '#database/factories/boat_engine_factory'
import { MediaFactory } from '#database/factories/media_factory'
import { BoatEnginePartFactory } from '#database/factories/boat_engine_part_factory'
import Client from '#models/client'
import {
  createAdminUser,
  createBoatOwnerUser,
  createEnterpriseAdminUser,
  createMechanicUser,
  createMemberUser,
} from '#tests/functional/helpers'
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
    // Le tampon n'est pas un JPEG : le `Content-Type` doit suivre `format`,
    // pas ce que Cloudinary aurait annoncé en sniffant ces octets (#784).
    const cloud = swapFakeCloudinary({
      download: Buffer.from('<html>not a jpeg</html>'),
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

  test('le Content-Type suit le format en base, pas le contenu renvoyé (#784)', async ({
    client,
    assert,
  }) => {
    // HTML servi tel quel : si la route relayait un type sniffé ou annoncé
    // par Cloudinary, le navigateur recevrait `text/html` depuis notre origine.
    swapFakeCloudinary({
      download: Buffer.from('<html><script>alert(1)</script></html>'),
    })
    const { user, boat, media } = await seedBoatMedia({ format: 'pdf' })

    const response = await client.get(`/boats/${boat.id}/media/${media.id}/download`).loginAs(user)

    response.assertStatus(200)
    response.assertHeader('content-type', 'application/pdf')
    assert.include(response.header('content-disposition'), 'attachment;')
    assert.notInclude(response.header('content-type'), 'html')
  })

  test('un format hors allowlist est servi en octet-stream (#784)', async ({ client, assert }) => {
    swapFakeCloudinary({
      download: Buffer.from('<html><script>alert(1)</script></html>'),
    })
    const { user, boat, media } = await seedBoatMedia({
      format: 'html',
      originalFilename: 'page',
    })

    const response = await client.get(`/boats/${boat.id}/media/${media.id}/download`).loginAs(user)

    response.assertStatus(200)
    response.assertHeader('content-type', 'application/octet-stream')
    assert.include(response.header('content-disposition'), 'attachment;')
    assert.include(response.header('content-disposition'), 'filename="page.html"')
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

  test("un mechanic de l'organisation est refusé — le téléchargement exige boats.view (#846)", async ({
    client,
    assert,
  }) => {
    const cloud = swapFakeCloudinary()
    const { user, boat, media } = await seedBoatMedia()
    const mechanic = await createMechanicUser(user.organizationId!)

    const response = await client
      .get(`/boats/${boat.id}/media/${media.id}/download`)
      .loginAs(mechanic)
      .redirects(0)

    // Ce test figeait l'écart inverse (200) : le durcissement annoncé est fait.
    // Un document ne doit pas être plus accessible que la fiche qui l'affiche.
    response.assertStatus(403)
    assert.isEmpty(cloud.downloaded)
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

/**
 * Matrice des rôles intra-organisation (#846).
 *
 * Le cloisonnement cross-org est couvert plus haut ; ce qui manquait, c'est la
 * frontière **à l'intérieur** d'une organisation. Les quatre routes de
 * téléchargement authentifiaient et scopaient par organisation, sans policy :
 * un `mechanic` récupérait la pièce d'identité d'un client, un `boat_owner`
 * l'acte de francisation d'un bateau qui n'est pas le sien.
 *
 * Chaque refus vérifie aussi que Cloudinary n'a rien servi : un 403 posé
 * **après** la lecture du fichier aurait le bon statut et fuirait quand même.
 */
type Role = 'member' | 'mechanic' | 'boat_owner'

async function userWithRole(role: Role, organizationId: number) {
  if (role === 'member') return createMemberUser(organizationId)
  if (role === 'mechanic') return createMechanicUser(organizationId)
  return createBoatOwnerUser(organizationId)
}

/** Les trois routes bateau, chacune avec son média. */
async function seedBoatDownloads() {
  const admin = await createAdminUser()
  const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
  const engine = await BoatEngineFactory.merge({ boatId: boat.id }).create()
  const part = await BoatEnginePartFactory.merge({ boatEngineId: engine.id }).create()

  const doc = (entityType: Media['entityType'], entityId: number) =>
    MediaFactory.merge({
      entityType,
      entityId,
      kind: 'document',
      format: 'pdf',
      uploadedById: admin.id,
    }).create()

  const boatMedia = await doc('boat', boat.id)
  const engineMedia = await doc('boat_engine', engine.id)
  const partMedia = await doc('boat_engine_part', part.id)

  return {
    admin,
    boat,
    urls: {
      boat: `/boats/${boat.id}/media/${boatMedia.id}/download`,
      engine: `/boats/${boat.id}/engines/${engine.id}/media/${engineMedia.id}/download`,
      part: `/boats/${boat.id}/engines/${engine.id}/parts/${part.id}/media/${partMedia.id}/download`,
    },
  }
}

test.group('Media download — matrice des rôles intra-organisation (#846)', (group) => {
  group.each.setup(() => truncateDb())
  group.each.teardown(() => restoreCloudinary())

  const boatRoutes = ['boat', 'engine', 'part'] as const
  const refused: Role[] = ['mechanic', 'boat_owner']

  for (const route of boatRoutes) {
    for (const role of refused) {
      test(`${role} → 403 sur le téléchargement ${route}`, async ({ client, assert }) => {
        const cloud = swapFakeCloudinary()
        const { admin, urls } = await seedBoatDownloads()
        const user = await userWithRole(role, admin.organizationId!)

        const response = await client.get(urls[route]).loginAs(user).redirects(0)

        response.assertStatus(403)
        assert.isEmpty(cloud.downloaded)
      })
    }

    test(`member (boats.view) → 200 sur le téléchargement ${route}`, async ({ client, assert }) => {
      const cloud = swapFakeCloudinary()
      const { admin, urls } = await seedBoatDownloads()
      const member = await createMemberUser(admin.organizationId!)

      const response = await client.get(urls[route]).loginAs(member)

      response.assertStatus(200)
      assert.lengthOf(cloud.downloaded, 1)
    })
  }

  test("boat_owner rattaché au bateau → 403 : la route staff n'est pas son portail", async ({
    client,
    assert,
  }) => {
    const cloud = swapFakeCloudinary()
    const { admin, boat, urls } = await seedBoatDownloads()
    const owner = await createBoatOwnerUser(admin.organizationId!)
    await owner.related('ownedBoats').attach([boat.id])

    const response = await client.get(urls.boat).loginAs(owner).redirects(0)

    // Le jeu de capabilities du boat_owner est volontairement vide : son accès
    // passe par `/owner/boats/:id`, scopé par ownership. Posséder le bateau ne
    // lui ouvre pas les routes staff, qui servent tous les documents.
    response.assertStatus(403)
    assert.isEmpty(cloud.downloaded)
  })

  async function seedClientDocument() {
    const admin = await createEnterpriseAdminUser()
    const record = await Client.create({
      organizationId: admin.organizationId!,
      firstName: 'Alice',
      lastName: 'Martin',
      status: 'active',
    })
    const media = await MediaFactory.merge({
      entityType: 'client',
      entityId: record.id,
      kind: 'document',
      format: 'pdf',
      originalFilename: 'permis',
      uploadedById: admin.id,
    }).create()
    return { admin, url: `/clients/${record.id}/media/${media.id}/download` }
  }

  for (const role of refused) {
    test(`${role} → 403 sur un document client (permis, identité)`, async ({ client, assert }) => {
      const cloud = swapFakeCloudinary()
      const { admin, url } = await seedClientDocument()
      const user = await userWithRole(role, admin.organizationId!)

      const response = await client.get(url).loginAs(user).redirects(0)

      response.assertStatus(403)
      assert.isEmpty(cloud.downloaded)
    })
  }

  test('member (clients.create) → 200 sur un document client', async ({ client, assert }) => {
    const cloud = swapFakeCloudinary()
    const { admin, url } = await seedClientDocument()
    const member = await createMemberUser(admin.organizationId!)

    const response = await client.get(url).loginAs(member)

    response.assertStatus(200)
    assert.lengthOf(cloud.downloaded, 1)
  })
})
