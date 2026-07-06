import { UserFactory } from '#database/factories/user_factory'
import testUtils from '@adonisjs/core/services/test_utils'
import { test } from '@japa/runner'

/**
 * Régression issue #279 : un utilisateur authentifié dont `organizationId` est
 * `null` (course à l'onboarding, org supprimée, fixture) atteignait une route
 * gatée qui appelle `quotaService.assertCan*(user.organization)`. Avec `org`
 * null, `PLAN_LIMITS[org.plan]` levait une `TypeError` → 500 non géré.
 *
 * Désormais `QuotaService` lève une `UserNotInOrganizationError` (erreur métier)
 * traitée par le handler global → redirection propre vers l'accueil (pas de 500).
 */
test.group('No-organization guard on gated routes (issue #279)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('clients index: user without org is redirected to / (not 500)', async ({ client }) => {
    // UserFactory sans .with('organization') → organizationId null
    const user = await UserFactory.create()

    const response = await client.get('/clients').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')
  })

  test('csv export: user without org is redirected to / (not 500)', async ({ client }) => {
    const user = await UserFactory.create()

    const response = await client.get('/boats/1/export/maintenance.csv').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')
  })

  test('ai chat: user without org is redirected to / (not 500)', async ({ client }) => {
    const user = await UserFactory.create()

    const response = await client
      .post('/ai/chat')
      .loginAs(user)
      .form({ messages: [{ role: 'user', content: 'Bonjour' }] })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/')
  })
})
