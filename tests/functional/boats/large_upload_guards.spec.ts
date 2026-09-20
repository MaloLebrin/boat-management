import { test } from '@japa/runner'
import { readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser } from '#tests/functional/helpers'
import Media from '#models/media'
import { restoreCloudinary, swapFakeCloudinary } from '#tests/support/fakes'
import { MAX_FILES_PER_BATCH } from '#shared/constants/media'

/**
 * Gardes des envois groupés (#764).
 *
 * `LargeMultipartUploadMiddleware` écrivait **chaque partie en entier sur le
 * disque** avant qu'aucun validateur ne s'exécute : `onFile('*')` accepte
 * n'importe quelle partie, `deferValidations: true` reporte explicitement les
 * contrôles, et le plafond unique de 400 Mo valait pour les douze routes.
 * Un attaquant authentifié n'avait pas besoin d'envoyer des fichiers valides —
 * 400 Mo de zéros sous un nom de champ quelconque étaient écrits, puis
 * rejetés.
 *
 * Ce spec mesure les deux choses qui comptent : **ce que l'utilisateur voit
 * ne change pas** (le refus reste celui du validateur), et **rien n'est écrit
 * sur le disque** pour une partie qui ne pouvait de toute façon pas passer.
 */

/** Photographie du contenu de `tmpdir()`, pour mesurer ce qu'une requête y laisse. */
async function tmpSnapshot(): Promise<Set<string>> {
  return new Set(await readdir(tmpdir()))
}

async function tmpFilesAddedSince(before: Set<string>): Promise<string[]> {
  const after = await readdir(tmpdir())
  return after.filter((name) => !before.has(name))
}

const JPEG = Buffer.from('\xff\xd8\xff\xe0 fake jpeg', 'binary')

test.group('Large upload guards (functional)', (group) => {
  group.each.setup(() => truncateDb())

  test('a disallowed extension is refused without touching the disk', async ({
    client,
    assert,
  }) => {
    const fake = swapFakeCloudinary()
    try {
      const user = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
      const before = await tmpSnapshot()

      const response = await client
        .post(`/boats/${boat.id}/photos`)
        .loginAs(user)
        .file('files[]', Buffer.alloc(64 * 1024, 0), {
          filename: 'charge-utile.bin',
          contentType: 'application/octet-stream',
        })
        .redirects(0)

      // Le refus reste celui du validateur : l'utilisateur voit la même chose.
      response.assertStatus(302)
      assert.lengthOf(await Media.all(), 0)
      assert.lengthOf(fake.uploaded, 0)

      // Et c'est le point de l'issue : rien n'a été écrit.
      assert.deepEqual(
        await tmpFilesAddedSince(before),
        [],
        'une extension refusée ne doit pas laisser de fichier temporaire'
      )
    } finally {
      restoreCloudinary()
    }
  })

  test('a valid photo still goes through, and leaves no temp file behind', async ({
    client,
    assert,
  }) => {
    // Le témoin, et le second correctif : les fichiers acceptés puis
    // consommés étaient eux aussi laissés dans `tmpdir()` — le `unlink` du
    // middleware ne couvrait que l'échec du `pipeline`.
    const fake = swapFakeCloudinary()
    try {
      const user = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
      const before = await tmpSnapshot()

      const response = await client
        .post(`/boats/${boat.id}/photos`)
        .loginAs(user)
        .file('files[]', JPEG, { filename: 'photo.jpg', contentType: 'image/jpeg' })
        .redirects(0)

      response.assertStatus(302)
      assert.lengthOf(await Media.all(), 1)
      assert.lengthOf(fake.uploaded, 1)

      assert.deepEqual(
        await tmpFilesAddedSince(before),
        [],
        'le fichier temporaire doit être nettoyé en fin de requête'
      )
    } finally {
      restoreCloudinary()
    }
  })

  test('parts beyond the batch cap are dropped before being written', async ({
    client,
    assert,
  }) => {
    const fake = swapFakeCloudinary()
    try {
      const user = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
      const before = await tmpSnapshot()

      let request = client.post(`/boats/${boat.id}/photos`).loginAs(user)
      for (let index = 0; index < MAX_FILES_PER_BATCH + 5; index += 1) {
        request = request.file('files[]', JPEG, {
          filename: `photo-${index}.jpg`,
          contentType: 'image/jpeg',
        })
      }

      const response = await request.redirects(0)

      response.assertStatus(302)
      // Le validateur refuse le lot entier (`maxLength(20)`), mais le
      // middleware a cessé d'écrire bien avant d'en arriver là.
      assert.lengthOf(await Media.all(), 0)
      assert.lengthOf(fake.uploaded, 0)
      assert.deepEqual(await tmpFilesAddedSince(before), [])
    } finally {
      restoreCloudinary()
    }
  })

  test('a document batch still accepts a PDF', async ({ client, assert }) => {
    // Second témoin : les deux familles de routes ont des listes d'extensions
    // différentes, et le middleware lit la bonne.
    const fake = swapFakeCloudinary()
    try {
      const user = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

      const response = await client
        .post(`/boats/${boat.id}/documents`)
        .loginAs(user)
        .file('files[]', Buffer.from('%PDF-1.4 fake'), {
          filename: 'contrat.pdf',
          contentType: 'application/pdf',
        })
        .redirects(0)

      response.assertStatus(302)
      assert.lengthOf(fake.uploaded, 1)
    } finally {
      restoreCloudinary()
    }
  })

  test('a photo extension is refused on a document route', async ({ client, assert }) => {
    // L'inverse du précédent : chaque route a sa propre allowlist, et la
    // confondre reviendrait à n'en avoir aucune.
    const fake = swapFakeCloudinary()
    try {
      const user = await createAdminUser()
      const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

      const response = await client
        .post(`/boats/${boat.id}/documents`)
        .loginAs(user)
        .file('files[]', JPEG, { filename: 'photo.jpg', contentType: 'image/jpeg' })
        .redirects(0)

      response.assertStatus(302)
      assert.lengthOf(fake.uploaded, 0)
      assert.lengthOf(await Media.all(), 0)
    } finally {
      restoreCloudinary()
    }
  })
})
