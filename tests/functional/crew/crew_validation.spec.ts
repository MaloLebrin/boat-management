import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { CrewMemberFactory } from '#database/factories/crew_member_factory'
import { createAdminUser } from '#tests/functional/helpers'
import { assertFieldErrors, assertNoFieldErrors } from '#tests/support/validation'
import CrewMember from '#models/crew_member'
import type { ApiClient } from '@japa/api-client'

/**
 * Chemins d'erreur de `createCrewMemberValidator` et
 * `createCrewCertificationValidator` (#688).
 *
 * ⚠️ L'issue #688 annonçait un cas « date d'expiration antérieure à la
 * délivrance » : il n'existe pas. Une certification ne porte qu'`expiresAt` —
 * aucune date de délivrance n'est saisie, donc aucune cohérence à vérifier
 * entre les deux. Le cas est remplacé ici par ce que le schéma garde
 * réellement : le vocabulaire des titres et le format de la date.
 */

const VALID_MEMBER = { firstName: 'Léa', lastName: 'Bernard' }

test.group('Crew validation (functional)', (group) => {
  group.each.setup(() => truncateDb())

  async function postMember(client: ApiClient, overrides: Record<string, unknown> = {}) {
    const user = await createAdminUser()

    return client
      .post('/crew')
      .form({ ...VALID_MEMBER, ...overrides })
      .loginAs(user)
      .redirects(0)
  }

  async function postCertification(client: ApiClient, overrides: Record<string, unknown> = {}) {
    const user = await createAdminUser()
    const member = await CrewMemberFactory.merge({
      organizationId: user.organizationId!,
    }).create()

    return client
      .post(`/crew/${member.id}/certifications`)
      .form({ type: 'coastal_permit', ...overrides })
      .loginAs(user)
      .redirects(0)
  }

  // --- membre d'équipage ---

  test('the reference member payload passes the validator', async ({ client, assert }) => {
    const response = await postMember(client)

    assertNoFieldErrors(assert, response)
    assert.lengthOf(await CrewMember.all(), 1)
  })

  test('rejects an empty lastName', async ({ client, assert }) => {
    assertFieldErrors(assert, await postMember(client, { lastName: '' }), ['lastName'])
  })

  test('rejects a malformed email', async ({ client, assert }) => {
    assertFieldErrors(assert, await postMember(client, { email: 'lea@' }), ['email'])
  })

  test('rejects a phone longer than 50 characters', async ({ client, assert }) => {
    assertFieldErrors(assert, await postMember(client, { phone: '0'.repeat(51) }), ['phone'])
  })

  // --- certification ---

  test('the reference certification payload passes the validator', async ({ client, assert }) => {
    assertNoFieldErrors(assert, await postCertification(client))
  })

  test('rejects a certification type outside NAVIGATION_TITLES', async ({ client, assert }) => {
    assertFieldErrors(assert, await postCertification(client, { type: 'submarine_licence' }), [
      'type',
    ])
  })

  test('rejects a malformed expiresAt', async ({ client, assert }) => {
    assertFieldErrors(assert, await postCertification(client, { expiresAt: '31/12/2026' }), [
      'expiresAt',
    ])
  })
})
