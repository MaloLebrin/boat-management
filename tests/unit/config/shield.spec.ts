import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import shieldConfig from '#config/shield'

/**
 * Garde de configuration Shield (#698).
 *
 * `start/kernel.ts:29` retire Shield du pipeline en environnement de test
 * (`...(app.inTest ? [] : [...])`) : aucun test fonctionnel ne peut donc
 * prouver l'exclusion CSRF de `/webhooks/stripe`. Or Stripe n'envoie pas de
 * jeton CSRF — sans cette exclusion, chaque livraison de webhook prendrait un
 * 403 en production, et les changements de plan cesseraient silencieusement.
 * D'où cette assertion sur la config elle-même.
 */
test.group('Shield config (unit)', () => {
  test('the Stripe webhook route is exempt from CSRF verification', ({ assert }) => {
    assert.isTrue(shieldConfig.csrf.enabled)
    assert.include(shieldConfig.csrf.exceptRoutes as string[], '/webhooks/stripe')
  })

  test('the Stripe Connect webhook route is exempt from CSRF verification (#876)', ({ assert }) => {
    assert.include(shieldConfig.csrf.exceptRoutes as string[], '/webhooks/stripe/connect')
  })

  test('CSP declares frame-ancestors none and form-action self (#779)', ({ assert }) => {
    const directives = shieldConfig.csp.directives as Record<string, string[] | undefined>
    assert.deepEqual(directives.frameAncestors, ["'none'"])
    assert.deepEqual(directives.formAction, ["'self'"])
    assert.deepEqual(directives.connectSrc, ["'self'"])
  })

  test('X-Frame-Options remains DENY alongside frame-ancestors (#779)', ({ assert }) => {
    assert.isTrue(shieldConfig.xFrame.enabled)
    assert.equal(shieldConfig.xFrame.action, 'DENY')
  })

  test('CSP is report-only outside production (#779)', ({ assert }) => {
    assert.equal(shieldConfig.csp.reportOnly, !app.inProduction)
  })

  test('HSTS omits includeSubDomains and preload (#779)', ({ assert }) => {
    assert.isTrue(shieldConfig.hsts.enabled)
    assert.equal(shieldConfig.hsts.maxAge, '180 days')
    assert.notEqual(shieldConfig.hsts.includeSubDomains, true)
    assert.notEqual(shieldConfig.hsts.preload, true)
  })
})
