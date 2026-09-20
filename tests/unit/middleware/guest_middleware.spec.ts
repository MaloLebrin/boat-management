import { test } from '@japa/runner'
import GuestMiddleware from '#middleware/guest_middleware'
import { makeCtx } from '#tests/support/http_context'

/**
 * Interdit les pages réservées aux visiteurs (login, inscription, mot de passe
 * oublié) à un utilisateur déjà connecté (#690).
 *
 * Contrairement à `AuthMiddleware`, le refus est écrit **ici** : c'est donc le
 * middleware du lot dont un test unitaire prouve réellement le comportement.
 */

test.group('GuestMiddleware (unit)', () => {
  test('redirects an authenticated visitor to the dashboard', async ({ assert }) => {
    const middleware = new GuestMiddleware()
    const { ctx, redirectCalls, reflash } = makeCtx({ authenticated: true })
    let nextCalled = 0

    await middleware.handle(ctx, async () => {
      nextCalled++
    })

    assert.equal(nextCalled, 0, 'la page visiteur ne doit pas être rendue')
    // `withQs(false)` **jette** la query string. Le commentaire précédent
    // lisait l'API à l'envers : `redirect(target, true)` la *conservait*, et un
    // `/reset-password?token=…` visité par un utilisateur déjà connecté
    // repartait donc en `/dashboard?token=…`, jeton encore valide compris
    // (#770). L'assertion figeait le bug.
    assert.deepEqual(redirectCalls, [{ target: '/dashboard', forwardQs: false }])
    // `reflash()` reporte les messages flash en cours sur la requête suivante —
    // sans lui, un message d'erreur disparaîtrait au passage de la redirection.
    assert.equal(reflash.reflashCount, 1)
  })

  test('lets an anonymous visitor through', async ({ assert }) => {
    const middleware = new GuestMiddleware()
    const { ctx, redirectCalls, reflash } = makeCtx({ authenticated: false })
    let nextCalled = 0

    await middleware.handle(ctx, async () => {
      nextCalled++
    })

    assert.equal(nextCalled, 1)
    assert.deepEqual(redirectCalls, [])
    assert.equal(reflash.reflashCount, 0)
  })

  test('falls back to the default guard when none is given', async ({ assert }) => {
    const middleware = new GuestMiddleware()
    const { ctx, checkedGuards } = makeCtx({ authenticated: false, defaultGuard: 'web' })

    await middleware.handle(ctx, async () => {})

    // Les routes de `start/routes/auth.ts` montent `middleware.guest()` sans
    // argument : c'est ce repli qui décide quelle session est consultée.
    assert.deepEqual(checkedGuards, ['web'])
  })

  test('checks every guard it is given', async ({ assert }) => {
    const middleware = new GuestMiddleware()
    const { ctx, checkedGuards } = makeCtx({ authenticated: false })

    await middleware.handle(ctx, async () => {}, { guards: ['web', 'api'] as never })

    assert.deepEqual(checkedGuards, ['web', 'api'])
  })
})
