import { test } from '@japa/runner'
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
})
