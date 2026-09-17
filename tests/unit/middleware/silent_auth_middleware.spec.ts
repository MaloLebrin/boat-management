import { test } from '@japa/runner'
import SilentAuthMiddleware from '#middleware/silent_auth_middleware'
import { makeCtx } from '#tests/support/http_context'

/**
 * Authentification silencieuse, montée en middleware **global** (#690).
 *
 * Tout son intérêt tient dans ce qu'il ne fait pas : peupler `ctx.auth.user`
 * quand une session existe, sans jamais refuser quand elle n'existe pas. Comme
 * il est global, un `return` mal placé qui transformerait `check()` en garde
 * fermerait le site public entier — pages marketing, partages de simulateur,
 * webhooks — d'un seul coup.
 */

test.group('SilentAuthMiddleware (unit)', () => {
  test('continues when no session is present', async ({ assert }) => {
    const middleware = new SilentAuthMiddleware()
    const { ctx, redirects } = makeCtx({ authenticated: false })
    let nextCalled = 0

    await middleware.handle(ctx, async () => {
      nextCalled++
    })

    assert.equal(nextCalled, 1, 'une visite anonyme doit traverser le middleware global')
    assert.deepEqual(redirects, [])
  })

  test('continues when a session is present', async ({ assert }) => {
    const user = { id: 1 }
    const middleware = new SilentAuthMiddleware()
    const { ctx } = makeCtx({ authenticated: true, user })
    let nextCalled = 0

    await middleware.handle(ctx, async () => {
      nextCalled++
    })

    assert.equal(nextCalled, 1)
    assert.strictEqual(ctx.auth.user as never, user, 'la session reconnue peuple ctx.auth.user')
  })
})
