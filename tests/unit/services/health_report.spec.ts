import { test } from '@japa/runner'
import { buildHealthReport } from '#services/health_service'

test.group('Health report (#865)', () => {
  test('des clés VAPID absentes ne font pas échouer la probe', ({ assert }) => {
    assert.deepEqual(buildHealthReport(true, false), {
      status: 'ok',
      checks: { database: 'ok', vapid: 'missing' },
    })
  })

  test('la base tombée reste le seul motif de 503, clés présentes ou non', ({ assert }) => {
    assert.equal(buildHealthReport(false, true).status, 'error')
    assert.equal(buildHealthReport(false, true).checks.vapid, 'ok')
    assert.equal(buildHealthReport(false, false).checks.vapid, 'missing')
    assert.deepEqual(buildHealthReport(true, true), {
      status: 'ok',
      checks: { database: 'ok', vapid: 'ok' },
    })
  })
})
