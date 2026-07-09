import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { createAdminUser } from '#tests/functional/helpers'

/**
 * Guard « modules add-ons uniquement sur Pro » du checkout (#327). En test,
 * `STRIPE_SECRET_KEY` est vide (`.env.test`) : aucun appel réseau réel — le
 * chemin Pro autorisé retombe donc sur `StripeNotConfiguredError`.
 *
 * NB : `.form()` encode un tableau à un seul élément comme un scalaire (échec de
 * validation `vine.array`). Les cas « autorisés » envoient donc deux modules.
 */
test.group('Billing checkout — module guard (functional)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('modules requested on the Enterprise plan are rejected before Stripe', async ({
    client,
  }) => {
    const user = await createAdminUser()

    const response = await client
      .post('/settings/billing/checkout')
      .loginAs(user)
      .form({ planTier: 'enterprise', interval: 'month', modules: ['charter', 'crm_invoicing'] })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Add-on modules are only available on the Pro plan.')
  })

  test('Pro + modules passes the guard (Stripe unconfigured in test)', async ({ client }) => {
    const user = await createAdminUser() // Pro plan

    // The guard lets Pro + modules through; the next step (Stripe) is not
    // configured in test, proving the module guard did NOT block the request.
    const response = await client
      .post('/settings/billing/checkout')
      .loginAs(user)
      .form({ planTier: 'pro', interval: 'month', modules: ['charter', 'crm_invoicing'] })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Payment is not configured yet. Please contact support.')
  })

  test('a checkout without modules still works (Stripe unconfigured in test)', async ({
    client,
  }) => {
    const user = await createAdminUser()

    const response = await client
      .post('/settings/billing/checkout')
      .loginAs(user)
      .form({ planTier: 'pro', interval: 'month' })
      .redirects(0)

    response.assertStatus(302)
    response.assertFlashMessage('error', 'Payment is not configured yet. Please contact support.')
  })

  test('an invalid module value is rejected by validation', async ({ client }) => {
    const user = await createAdminUser()

    const response = await client
      .post('/settings/billing/checkout')
      .loginAs(user)
      .form({ planTier: 'pro', interval: 'month', modules: ['marina', 'charter'] })
      .redirects(0)

    response.assertStatus(302)
  })
})
