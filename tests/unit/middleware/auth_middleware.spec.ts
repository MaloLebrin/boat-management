import { test } from '@japa/runner'
import AuthMiddleware from '#middleware/auth_middleware'
import { makeCtx } from '#tests/support/http_context'

/**
 * Garde d'authentification (#690).
 *
 * ⚠️ Ce que ces tests **ne prouvent pas** : la redirection vers `/login`. Elle
 * n'est pas écrite dans ce middleware — `auth.authenticateUsing()` lève
 * `E_UNAUTHORIZED_ACCESS`, et c'est le handler d'exceptions qui traduit le
 * `loginRoute` en 302. Un test unitaire ne peut vérifier que ce qui appartient
 * au middleware : les arguments qu'il transmet, et le fait qu'il n'appelle pas
 * la suite quand l'authentification échoue.
 *
 * La redirection réelle est couverte par les tests fonctionnels des routes
 * protégées (`tests/functional/auth/`).
 */

test.group('AuthMiddleware (unit)', () => {
  test('passes the login route down to the authenticator', async ({ assert }) => {
    const middleware = new AuthMiddleware()
    const { ctx, authenticateCalls } = makeCtx()
    let nextCalled = 0

    await middleware.handle(
      ctx,
      async () => {
        nextCalled++
      },
      { guards: ['web'] as never }
    )

    assert.equal(nextCalled, 1)
    // C'est ce `loginRoute` que le handler d'exceptions lit pour construire la
    // redirection : le perdre donnerait un 401 brut à la place de la page de
    // connexion.
    assert.deepEqual(authenticateCalls, [{ guards: ['web'], options: { loginRoute: '/login' } }])
  })

  test('forwards undefined guards so the authenticator picks its default', async ({ assert }) => {
    const middleware = new AuthMiddleware()
    const { ctx, authenticateCalls } = makeCtx()

    await middleware.handle(ctx, async () => {})

    assert.deepEqual(authenticateCalls, [{ guards: undefined, options: { loginRoute: '/login' } }])
  })

  test('does not run the route when authentication fails', async ({ assert }) => {
    const middleware = new AuthMiddleware()
    const { ctx } = makeCtx({ authenticateError: new Error('E_UNAUTHORIZED_ACCESS') })
    let nextCalled = 0

    await assert.rejects(
      () =>
        middleware.handle(ctx, async () => {
          nextCalled++
        }),
      'E_UNAUTHORIZED_ACCESS'
    )

    assert.equal(nextCalled, 0, 'le contrôleur ne doit jamais voir une requête non authentifiée')
  })
})
