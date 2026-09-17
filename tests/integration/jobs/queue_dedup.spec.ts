import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import QueueDedupKey, { QUEUE_DEDUP_KEY_STATUSES } from '#models/queue_dedup_key'
import QueueDedupService from '#services/queue_dedup_service'
import GenerateExport from '#jobs/generate_export'

/**
 * Déduplication de file (#699).
 *
 * C'est le mécanisme qui empêche un job rejoué de doubler ses effets : une
 * ligne `queue_dedup_keys` par unité de travail, et une contrainte d'unicité sur
 * la clé qui fait échouer le second `enqueueUnique`. Il est utilisé par la
 * plupart des jobs et n'avait aucun test propre.
 *
 * ⚠️ Ce que ces tests établissent, et que l'issue #699 supposait faux :
 * **un échec ne libère pas la clé**. `markFailed` se contente de passer la ligne
 * en `failed` et d'y écrire le message ; la ligne reste, donc la contrainte
 * d'unicité continue de refuser tout ré-enfilement de la même clé. Le travail
 * échoué n'est pas re-programmable sans intervention. Figé ici tel qu'il est —
 * c'est le comportement réel, et il mérite d'être vu avant d'être changé.
 *
 * ⚠️ Piège de la suite `integration` : `withGlobalTransaction()` ouvre **une**
 * transaction pour toute la suite, pas une par test. Les lignes insérées par un
 * test restent donc visibles des suivants — d'où une clé distincte par test
 * ci-dessous. Partager une clé ferait échouer le premier `enqueueUnique` du test
 * suivant sur la contrainte d'unicité, et le test mesurerait autre chose que ce
 * qu'il croit.
 */

async function service() {
  return app.container.make(QueueDedupService)
}

async function enqueue(key: string, dispatched: string[]) {
  const dedup = await service()
  return dedup.enqueueUnique({
    key,
    jobName: 'GenerateExport',
    queue: 'default',
    payload: { exportId: 1 },
    dispatch: async () => {
      dispatched.push(key)
    },
  })
}

test.group('QueueDedupService', () => {
  test('the first enqueue goes through and records a pending key', async ({ assert }) => {
    const key = 'export:1:boats:first'
    const dispatched: string[] = []

    const result = await enqueue(key, dispatched)

    assert.isTrue(result.enqueued)
    assert.deepEqual(dispatched, [key])
    const row = await QueueDedupKey.findByOrFail('key', key)
    assert.equal(row.status, QUEUE_DEDUP_KEY_STATUSES.PENDING)
  })

  test('a second enqueue on the same key is refused and dispatches nothing', async ({ assert }) => {
    const key = 'export:1:boats:second'
    const dispatched: string[] = []

    await enqueue(key, dispatched)
    const second = await enqueue(key, dispatched)

    assert.isFalse(second.enqueued)
    // Le point qui compte : le `dispatch` n'a pas été rejoué. Une déduplication
    // qui refuserait la clé mais aurait déjà déclenché le travail ne servirait
    // à rien.
    assert.lengthOf(dispatched, 1)
  })

  test('a different key is not blocked by a neighbour', async ({ assert }) => {
    const dispatched: string[] = []

    await enqueue('export:1:boats:neighbour-a', dispatched)
    const other = await enqueue('export:1:boats:neighbour-b', dispatched)

    assert.isTrue(other.enqueued)
    assert.lengthOf(dispatched, 2)
  })

  test('markRunning then markCompleted walk the key through its states', async ({ assert }) => {
    const key = 'export:1:boats:states'
    const dedup = await service()
    await enqueue(key, [])

    await dedup.markRunning(key)
    const running = await QueueDedupKey.findByOrFail('key', key)
    assert.equal(running.status, QUEUE_DEDUP_KEY_STATUSES.RUNNING)

    await dedup.markCompleted(key)
    const done = await QueueDedupKey.findByOrFail('key', key)
    assert.equal(done.status, QUEUE_DEDUP_KEY_STATUSES.COMPLETED)
    assert.isNotNull(done.completedAt)
  })

  test('markFailed records the error but does NOT release the key', async ({ assert }) => {
    const key = 'export:1:boats:failed'
    const dedup = await service()
    const dispatched: string[] = []
    await enqueue(key, dispatched)

    await dedup.markFailed(key, new Error('Cloudinary indisponible'))

    const row = await QueueDedupKey.findByOrFail('key', key)
    assert.equal(row.status, QUEUE_DEDUP_KEY_STATUSES.FAILED)
    assert.equal(row.lastError, 'Cloudinary indisponible')

    // La ligne subsiste, donc la contrainte d'unicité refuse toujours : le même
    // travail ne peut pas être re-programmé après un échec.
    const retry = await enqueue(key, dispatched)
    assert.isFalse(retry.enqueued)
    assert.lengthOf(dispatched, 1)
  })
})

test.group('GenerateExport (job à la demande)', () => {
  test('its dedup key isolates an organization, a kind and an export id', async ({ assert }) => {
    // La clé est ce qui rend la déduplication correcte : trop large, deux
    // exports distincts se bloqueraient l'un l'autre ; trop étroite, le même
    // export partirait deux fois.
    assert.equal(
      GenerateExport.dedupKey({ organizationId: 3, kind: 'boats', exportId: 7 }),
      'export:3:boats:7'
    )
    assert.notEqual(
      GenerateExport.dedupKey({ organizationId: 3, kind: 'boats', exportId: 7 }),
      GenerateExport.dedupKey({ organizationId: 4, kind: 'boats', exportId: 7 })
    )
  })

  // ⚠️ `GenerateExport.execute()` ne produit **aucun export** : il logge et
  // marque sa clé. L'issue #699 le désignait comme « export silencieusement
  // vide » — c'est exact au sens propre, c'est un placeholder. Rien à tester de
  // plus tant qu'il n'est pas implémenté ; signalé plutôt que simulé.
})
