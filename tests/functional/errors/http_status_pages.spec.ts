import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import db from '@adonisjs/lucid/services/db'
import ShieldMiddleware from '@adonisjs/shield/shield_middleware'
import SessionMiddleware from '@adonisjs/session/session_middleware'
import { errors as shieldErrors } from '@adonisjs/shield'
import MaintenanceMode, { MAINTENANCE_RETRY_AFTER_SECONDS } from '#services/maintenance_mode'
import en from '../../../resources/lang/en/errors.json' with { type: 'json' }

/**
 * Débits déclarés dans `start/limiter.ts`. Les requêtes invalides consomment
 * le quota avant la validation : aucun appel Mistral, aucun e-mail.
 */
const CONTACT_LIMIT = 5
const PUBLIC_DIAGNOSIS_LIMIT = 6

async function clearThrottle(fragment: string) {
  await db.from('rate_limits').where('key', 'like', `%${fragment}%`).delete()
}

async function exhaust(
  client: {
    post: (url: string) => {
      form: (body: object) => {
        redirects: (n: number) => Promise<{ assertStatus: (code: number) => void }>
      }
    }
  },
  url: string,
  times: number
) {
  for (let index = 0; index < times; index += 1) {
    const passing = await client.post(url).form({}).redirects(0)
    passing.assertStatus(302)
  }
}

test.group('419 — session expirée (#864)', () => {
  test('a POST without a CSRF token raises E_BAD_CSRF_TOKEN', async ({ assert }) => {
    const ctx = await testUtils.createHttpContext()
    ctx.request.request.method = 'POST'
    ctx.request.request.url = '/contact'
    // Shield lit `ctx.route.pattern` pour les exclusions. Le contexte de test
    // n'a pas de route : sans ça, le garde lève un TypeError avant le jeton.
    ctx.route = { pattern: '/contact', name: 'marketing.contact.store' } as typeof ctx.route

    const session = await app.container.make(SessionMiddleware)
    const shield = await app.container.make(ShieldMiddleware)

    await assert.rejects(async () => {
      await session.handle(ctx, () => shield.handle(ctx, async () => {}))
    }, shieldErrors.E_BAD_CSRF_TOKEN)
  })

  test('that exception renders errors/session_expired with status 419', async ({ client }) => {
    const response = await client.post('/__tests/session-expired').withInertia().redirects(0)

    response.assertStatus(419)
    response.assertInertiaComponent('errors/session_expired')
    response.assertHeader('cache-control', 'no-store')
  })

  test('an HTML navigation receives the translated page', async ({ assert, client }) => {
    const response = await client
      .post('/__tests/session-expired')
      .header('Accept', 'text/html')
      .redirects(0)

    response.assertStatus(419)
    const html = response.text()
    assert.include(html, 'errors/session_expired')
    assert.include(html, `>${en.sessionExpired.title}</h1>`)
  })

  test('a JSON client keeps the Shield redirect, not the Inertia page', async ({
    assert,
    client,
  }) => {
    const response = await client
      .post('/__tests/session-expired')
      .header('Accept', 'application/json')
      .redirects(0)

    response.assertStatus(302)
    assert.notInclude(JSON.stringify(response.body()), 'errors/session_expired')
  })
})

test.group('429 — trop de requêtes (#864)', (group) => {
  group.each.setup(async () => {
    await clearThrottle('contact_')
    await clearThrottle('public_diag_')
  })

  test('an HTML contact POST over the limit renders the page and Retry-After', async ({
    assert,
    client,
  }) => {
    await exhaust(client, '/contact', CONTACT_LIMIT)

    const response = await client.post('/contact').form({}).withInertia().redirects(0)

    response.assertStatus(429)
    response.assertInertiaComponent('errors/too_many_requests')
    const retryAfter = Number(response.header('retry-after'))
    assert.isAbove(retryAfter, 0)
    const props = response.inertiaProps as { retryAfter: number; offerSignup: boolean }
    assert.equal(props.offerSignup, false)
    assert.isAbove(props.retryAfter, 0)
  })

  test('a public AI POST over the limit offers signup', async ({ assert, client }) => {
    await exhaust(client, '/diagnosis-ai/conversations', PUBLIC_DIAGNOSIS_LIMIT)

    const response = await client
      .post('/diagnosis-ai/conversations')
      .form({})
      .withInertia()
      .redirects(0)

    response.assertStatus(429)
    response.assertInertiaComponent('errors/too_many_requests')
    const props = response.inertiaProps as { offerSignup: boolean }
    assert.isTrue(props.offerSignup)
  })

  test('a JSON client keeps the limiter payload', async ({ assert, client }) => {
    await exhaust(client, '/contact', CONTACT_LIMIT)

    const response = await client.post('/contact').json({}).redirects(0)

    response.assertStatus(429)
    assert.notInclude(JSON.stringify(response.body()), 'errors/too_many_requests')
    assert.isAbove(Number(response.header('retry-after')), 0)
  })
})

test.group('503 — maintenance (#864)', (group) => {
  group.each.setup(() => {
    app.container.swap(MaintenanceMode, () => ({ isEnabled: () => true }) as MaintenanceMode)
  })

  group.each.teardown(() => {
    app.container.restore(MaintenanceMode)
  })

  test('every route except /up returns the static page', async ({ assert, client }) => {
    const page = await client.get('/').redirects(0)
    page.assertStatus(503)
    assert.equal(page.header('retry-after'), String(MAINTENANCE_RETRY_AFTER_SECONDS))
    assert.include(page.header('cache-control'), 'no-store')
    assert.include(page.text(), en.maintenance.title)
    assert.include(page.text(), 'Nous revenons dans quelques minutes')
    assert.isUndefined(page.header('x-inertia'))

    const post = await client.post('/login').form({}).redirects(0)
    post.assertStatus(503)

    const health = await client.get('/up')
    health.assertStatus(200)
  })
})
