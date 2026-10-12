import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import pushConfig from '#config/push'
import HealthService from '#services/health_service'

test.group('Healthcheck GET /up (functional)', (group) => {
  group.each.teardown(() => {
    app.container.restore(HealthService)
  })

  test('returns 200 with an ok report when the database answers', async ({ client, assert }) => {
    const response = await client.get('/up')

    response.assertStatus(200)
    assert.deepEqual(response.body(), {
      status: 'ok',
      checks: { database: 'ok', vapid: pushConfig.enabled ? 'ok' : 'missing' },
    })
  })

  // #953 — probe de connectivité côté PWA : `HEAD /up`, sans corps, sans
  // session (le client la lance aussi quand la session a expiré).
  test('answers HEAD with 200 and no body for the PWA connectivity probe', async ({
    client,
    assert,
  }) => {
    const response = await client.head('/up')

    response.assertStatus(200)
    assert.isNotOk(response.text())
  })

  test('returns 503 when the database is unreachable', async ({ client, assert }) => {
    app.container.swap(
      HealthService,
      () =>
        ({
          check: async () => ({ status: 'error', checks: { database: 'error' } }),
        }) as unknown as HealthService
    )

    const response = await client.get('/up')

    response.assertStatus(503)
    assert.deepEqual(response.body(), { status: 'error', checks: { database: 'error' } })
  })
})
