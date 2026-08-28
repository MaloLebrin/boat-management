import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import HealthService from '#services/health_service'

test.group('Healthcheck GET /up (functional)', (group) => {
  group.each.teardown(() => {
    app.container.restore(HealthService)
  })

  test('returns 200 with an ok report when the database answers', async ({ client, assert }) => {
    const response = await client.get('/up')

    response.assertStatus(200)
    assert.deepEqual(response.body(), { status: 'ok', checks: { database: 'ok' } })
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
