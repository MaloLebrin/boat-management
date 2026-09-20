import { test } from '@japa/runner'
import { LARGE_UPLOAD_LIMIT, LARGE_UPLOAD_ROUTES } from '#config/bodyparser'
import {
  DOCUMENT_MAX_SIZE_MB,
  largeUploadLimitFor,
  MAX_FILES_PER_BATCH,
  mediaBatchKindFor,
  PHOTO_MAX_SIZE_MB,
} from '#shared/constants/media'

/**
 * Garde des routes d'envoi groupé (#764).
 *
 * `LargeMultipartUploadMiddleware` déduit du **motif de route** la nature du
 * lot — photos ou documents — et en tire le plafond de charge utile ainsi que
 * la liste d'extensions à refuser avant écriture. Une treizième route ajoutée
 * à `LARGE_UPLOAD_ROUTES` sans se terminer par `/photos` ou `/documents`
 * perdrait ces deux gardes **en silence** : elle repartirait sur le plafond
 * documents et n'aurait aucune allowlist d'extensions.
 *
 * C'est ce test qui rend ce couplage visible.
 */
test.group('Hygiene — large upload routes (unit)', () => {
  test('the route list is not empty', ({ assert }) => {
    // Témoin : une liste vide rendrait les assertions suivantes vacantes.
    assert.isAbove(LARGE_UPLOAD_ROUTES.length, 0)
  })

  test('every batch route declares its kind through its pattern', ({ assert }) => {
    const unclassified = LARGE_UPLOAD_ROUTES.filter((route) => mediaBatchKindFor(route) === null)

    assert.deepEqual(
      unclassified,
      [],
      `Ces routes ne finissent ni par /photos ni par /documents : ${unclassified.join(', ')}. ` +
        'Renommez-les, ou étendez `mediaBatchKindFor` — sans quoi elles perdent leur plafond ' +
        'et leur allowlist d’extensions.'
    )
  })

  test('a photo batch is capped at what its validator can accept', ({ assert }) => {
    assert.equal(
      largeUploadLimitFor('/boats/:boatId/photos'),
      `${PHOTO_MAX_SIZE_MB * MAX_FILES_PER_BATCH}mb`
    )
    // 200 Mo et non 400 : c'est le point de l'issue.
    assert.equal(largeUploadLimitFor('/boats/:boatId/photos'), '200mb')
  })

  test('a document batch keeps the higher cap', ({ assert }) => {
    assert.equal(
      largeUploadLimitFor('/boats/:boatId/documents'),
      `${DOCUMENT_MAX_SIZE_MB * MAX_FILES_PER_BATCH}mb`
    )
    assert.equal(largeUploadLimitFor('/clients/:id/documents'), '400mb')
  })

  test('no route is allowed more than the family ceiling', ({ assert }) => {
    const ceiling = Number.parseInt(LARGE_UPLOAD_LIMIT, 10)

    for (const route of LARGE_UPLOAD_ROUTES) {
      assert.isAtMost(Number.parseInt(largeUploadLimitFor(route), 10), ceiling, route)
    }
  })
})
