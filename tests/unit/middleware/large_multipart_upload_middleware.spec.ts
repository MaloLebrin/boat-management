import { test } from '@japa/runner'
import LargeMultipartUploadMiddleware from '#middleware/large_multipart_upload_middleware'
import { LARGE_UPLOAD_LIMIT } from '#config/bodyparser'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Re-pilotage du streaming multipart pour les routes déclarées en
 * `processManually` (#690).
 *
 * ⚠️ Périmètre : ces tests couvrent la **garde** — quand le middleware
 * re-traite le corps, et avec quelle limite. Le streaming lui-même (écriture
 * disque, `pipeline`, nettoyage sur erreur) demande de vraies requêtes
 * multipart et reste couvert par `tests/functional/boats/boat_equipment_photos.spec.ts`.
 *
 * La garde vaut d'être fixée séparément parce qu'elle est doublement
 * conditionnelle : un `state` mal testé ferait re-traiter un corps déjà
 * consommé (`process()` sur un flux épuisé), et un `bodyType` mal testé
 * l'appliquerait à des requêtes JSON.
 */

interface MultipartCalls {
  onFile: Array<{ pattern: string; options: unknown }>
  process: unknown[]
}

function makeCtx(options: { bodyType?: string; state?: string }) {
  const calls: MultipartCalls = { onFile: [], process: [] }

  const ctx = {
    request: {
      bodyType: options.bodyType ?? 'multipart',
      multipart: {
        state: options.state ?? 'idle',
        onFile: (pattern: string, onFileOptions: unknown) => {
          calls.onFile.push({ pattern, options: onFileOptions })
        },
        process: async (processOptions: unknown) => {
          calls.process.push(processOptions)
        },
        abort: () => {},
      },
    },
  } as never as HttpContext

  return { ctx, calls }
}

test.group('LargeMultipartUploadMiddleware (unit)', () => {
  test('re-drives an idle multipart body with the large limit', async ({ assert }) => {
    const middleware = new LargeMultipartUploadMiddleware()
    const { ctx, calls } = makeCtx({ bodyType: 'multipart', state: 'idle' })
    let nextCalled = 0

    await middleware.handle(ctx, async () => {
      nextCalled++
    })

    assert.deepEqual(calls.process, [{ limit: LARGE_UPLOAD_LIMIT }])
    assert.lengthOf(calls.onFile, 1)
    assert.equal(calls.onFile[0].pattern, '*')
    // `deferValidations` laisse MediaService arbitrer taille et type après
    // écriture : les valider ici couperait le flux avant que `reporter` ait
    // renseigné `file.size`, dont dépendent les quotas de stockage.
    assert.deepEqual(calls.onFile[0].options, { deferValidations: true })
    assert.equal(nextCalled, 1)
  })

  test('leaves an already processed multipart body alone', async ({ assert }) => {
    const middleware = new LargeMultipartUploadMiddleware()
    const { ctx, calls } = makeCtx({ bodyType: 'multipart', state: 'processed' })
    let nextCalled = 0

    await middleware.handle(ctx, async () => {
      nextCalled++
    })

    // Re-traiter un flux déjà consommé ne rendrait aucun fichier : les routes
    // hors `processManually` passent par le bodyparser standard.
    assert.deepEqual(calls.process, [])
    assert.lengthOf(calls.onFile, 0)
    assert.equal(nextCalled, 1)
  })

  test('leaves a non-multipart body alone', async ({ assert }) => {
    const middleware = new LargeMultipartUploadMiddleware()
    const { ctx, calls } = makeCtx({ bodyType: 'json', state: 'idle' })
    let nextCalled = 0

    await middleware.handle(ctx, async () => {
      nextCalled++
    })

    assert.deepEqual(calls.process, [])
    assert.equal(nextCalled, 1)
  })
})
