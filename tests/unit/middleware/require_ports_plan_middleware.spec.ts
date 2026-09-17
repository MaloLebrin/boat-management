import { test } from '@japa/runner'
import RequirePortsPlanMiddleware from '#middleware/require_ports_plan_middleware'
import { QuotaExceededError } from '#exceptions/quota_errors'
import { PortsUnavailableForPrivateProfileError } from '#exceptions/port_errors'
import { BILLING_SETTINGS_PATH } from '#shared/constants/billing'
import { fakeOrganization, fakeUserWithOrganization, makeCtx } from '#tests/support/http_context'
import type QuotaService from '#services/quota_service'

/**
 * Garde de plan et de profil sur la cartographie de port (#690).
 *
 * Le middleware a deux refus qui ne mènent **pas au même endroit** : un plan
 * trop bas renvoie vers la facturation avec un upsell, un profil particulier
 * vers le dashboard — aucun abonnement ne lui ouvrira la section. Confondre les
 * deux vend un upgrade qui ne débloquerait rien.
 *
 * Il est posé sur le groupe de routes `/ports/*`, donc une route ajoutée au
 * groupe est gardée d'office : une régression ici ouvre quatre contrôleurs
 * (`Ports`, `Pontoons`, `Mouillages`, `Spots`) d'un coup.
 */

function makeMiddleware(error?: Error) {
  const asserted: unknown[] = []
  const quotaService = {
    // Synchrone, contrairement aux `assertCanManage*` de RequireModulePlan.
    assertCanManagePorts: (org: unknown) => {
      asserted.push(org)
      if (error) throw error
    },
  } as unknown as QuotaService
  return { middleware: new RequirePortsPlanMiddleware(quotaService), asserted }
}

function ctxFor(organization: Record<string, unknown>) {
  return makeCtx({ user: fakeUserWithOrganization(organization) })
}

test.group('RequirePortsPlanMiddleware (unit)', () => {
  test('lets an enterprise rental organization through', async ({ assert }) => {
    const organization = fakeOrganization({ plan: 'enterprise', type: 'rental' })
    const { middleware, asserted } = makeMiddleware()
    const { ctx, redirects, flashes } = ctxFor(organization)
    let nextCalled = 0

    await middleware.handle(ctx, async () => {
      nextCalled++
    })

    assert.equal(nextCalled, 1)
    assert.deepEqual(asserted, [organization], "l'organisation entière est passée au QuotaService")
    assert.deepEqual(redirects, [])
    assert.deepEqual(flashes, [])
  })

  test('sends a private profile to the dashboard, never to billing', async ({ assert }) => {
    const organization = fakeOrganization({ plan: 'enterprise', type: 'private' })
    const { middleware } = makeMiddleware(new PortsUnavailableForPrivateProfileError())
    const { ctx, redirects, flashes } = ctxFor(organization)
    let nextCalled = 0

    await middleware.handle(ctx, async () => {
      nextCalled++
    })

    assert.equal(nextCalled, 0)
    // Le plan est déjà le plus haut : proposer la facturation serait un upsell
    // vers un abonnement qui ne débloque rien.
    assert.deepEqual(redirects, ['/dashboard'])
    assert.deepEqual(flashes, [['error', 't:flash.ports.unavailableForPrivateProfile']])
  })

  test('sends an insufficient plan to billing', async ({ assert }) => {
    const organization = fakeOrganization({ plan: 'pro', type: 'rental' })
    const { middleware } = makeMiddleware(
      new QuotaExceededError('ports', { limit: null, current: 0, upgradeTo: 'enterprise' })
    )
    const { ctx, redirects, flashes } = ctxFor(organization)
    let nextCalled = 0

    await middleware.handle(ctx, async () => {
      nextCalled++
    })

    assert.equal(nextCalled, 0)
    assert.deepEqual(redirects, [BILLING_SETTINGS_PATH])
    assert.deepEqual(flashes, [['error', 't:flash.quota.portsExceeded']])
  })

  test('sends a starter plan to billing as well', async ({ assert }) => {
    const organization = fakeOrganization({ plan: 'starter', type: 'rental' })
    const { middleware } = makeMiddleware(
      new QuotaExceededError('ports', { limit: null, current: 0, upgradeTo: 'pro' })
    )
    const { ctx, redirects } = ctxFor(organization)

    await middleware.handle(ctx, async () => {})

    assert.deepEqual(redirects, [BILLING_SETTINGS_PATH])
  })

  test('lets any other error bubble up', async ({ assert }) => {
    const organization = fakeOrganization()
    const { middleware } = makeMiddleware(new TypeError('boom'))
    const { ctx, redirects, flashes } = ctxFor(organization)

    // Une erreur inattendue doit remonter au handler, pas être maquillée en
    // refus de quota : un flash « passez à Entreprise » sur une panne serait
    // un mensonge adressé à l'utilisateur.
    await assert.rejects(() => middleware.handle(ctx, async () => {}), TypeError)
    assert.deepEqual(redirects, [])
    assert.deepEqual(flashes, [])
  })
})
