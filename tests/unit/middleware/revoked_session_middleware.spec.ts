import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import RevokedSessionMiddleware from '#middleware/revoked_session_middleware'
import { AUTH_SESSION_STARTED_AT_KEY } from '#shared/constants/auth'
import { makeCtx } from '#tests/support/http_context'

/**
 * Révocation des sessions à la réinitialisation du mot de passe (#763).
 *
 * La comparaison se teste ici et non en fonctionnel : le plugin api-client de
 * Japa isole le magasin de sessions **par requête**, donc on ne peut pas
 * suivre la même session de part et d'autre d'une réinitialisation. Les specs
 * fonctionnels couvrent les effets observables (remember-me supprimés,
 * `sessionsValidAfter` posé, session non estampillée refusée) ; le cœur de la
 * décision se prouve ici.
 */

const NOW = DateTime.fromISO('2026-09-19T12:00:00.000Z')

function userWith(validAfter: DateTime | null) {
  return { id: 1, sessionsValidAfter: validAfter }
}

async function run(options: { validAfter: DateTime | null; startedAt: DateTime | null }) {
  const ctx = makeCtx({
    authenticated: true,
    user: userWith(options.validAfter),
    session:
      options.startedAt === null
        ? {}
        : { [AUTH_SESSION_STARTED_AT_KEY]: options.startedAt.toISO() },
  })
  let nextCalled = 0

  await new RevokedSessionMiddleware().handle(ctx.ctx, async () => {
    nextCalled += 1
  })

  return { ...ctx, nextCalled }
}

test.group('RevokedSessionMiddleware (unit)', () => {
  test('lets a session through when the account never revoked', async ({ assert }) => {
    const { nextCalled, redirects } = await run({
      validAfter: null,
      startedAt: NOW.minus({ days: 3 }),
    })

    assert.equal(nextCalled, 1)
    assert.deepEqual(redirects, [])
  })

  test('cuts a session opened before the revocation', async ({ assert }) => {
    // Le cas de l'issue : l'attaquant est connecté, la victime réinitialise.
    const { nextCalled, redirects, logoutCalls, flashes } = await run({
      validAfter: NOW,
      startedAt: NOW.minus({ hours: 2 }),
    })

    assert.equal(nextCalled, 0, 'la requête ne doit pas atteindre la route')
    assert.deepEqual(redirects, ['/login'])
    assert.lengthOf(logoutCalls, 1)
    assert.deepEqual(flashes, [['error', 't:flash.auth.sessionRevoked']])
  })

  test('lets a session opened after the revocation through', async ({ assert }) => {
    // La connexion légitime qui suit la réinitialisation.
    const { nextCalled, redirects } = await run({
      validAfter: NOW,
      startedAt: NOW.plus({ seconds: 1 }),
    })

    assert.equal(nextCalled, 1)
    assert.deepEqual(redirects, [])
  })

  test('lets a session stamped exactly at the revocation instant through', async ({ assert }) => {
    // La comparaison est stricte, et le changement de mot de passe depuis les
    // réglages en dépend : il réestampille la session courante avec la valeur
    // même de `sessionsValidAfter` pour ne pas déconnecter celui qui agit.
    const { nextCalled, redirects } = await run({ validAfter: NOW, startedAt: NOW })

    assert.equal(nextCalled, 1)
    assert.deepEqual(redirects, [])
  })

  test('cuts a session with no stamp when the account has revoked', async ({ assert }) => {
    // Échec fermé : une session ouverte avant le déploiement n'a pas
    // d'estampille, et ne peut donc pas prouver qu'elle est postérieure.
    const { nextCalled, redirects } = await run({ validAfter: NOW, startedAt: null })

    assert.equal(nextCalled, 0)
    assert.deepEqual(redirects, ['/login'])
  })

  test('cuts a session whose stamp is unparseable', async ({ assert }) => {
    const ctx = makeCtx({
      authenticated: true,
      user: userWith(NOW),
      session: { [AUTH_SESSION_STARTED_AT_KEY]: 'pas une date' },
    })
    let nextCalled = 0

    await new RevokedSessionMiddleware().handle(ctx.ctx, async () => {
      nextCalled += 1
    })

    assert.equal(nextCalled, 0)
    assert.deepEqual(ctx.redirects, ['/login'])
  })

  test('leaves an anonymous visitor alone', async ({ assert }) => {
    const ctx = makeCtx({ authenticated: false })
    let nextCalled = 0

    await new RevokedSessionMiddleware().handle(ctx.ctx, async () => {
      nextCalled += 1
    })

    assert.equal(nextCalled, 1)
    assert.deepEqual(ctx.redirects, [])
  })
})
