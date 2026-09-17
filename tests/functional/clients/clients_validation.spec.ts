import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { createEnterpriseAdminUser } from '#tests/functional/helpers'
import { assertFieldErrors, assertNoFieldErrors } from '#tests/support/validation'
import Client from '#models/client'
import type { ApiClient } from '@japa/api-client'

/**
 * Chemins d'erreur de `createClientValidator` (#688).
 *
 * La fiche client porte des données personnelles (RGPD, #563) : son e-mail sert
 * à l'envoi des contrats et des factures, et son statut `blacklisted` bloque la
 * création de réservations. Un statut hors vocabulaire passerait donc la
 * vérification de liste noire sans rien déclencher.
 */

const VALID = { firstName: 'Jean', lastName: 'Dupont' }

test.group('Clients validation (functional)', (group) => {
  group.each.setup(() => truncateDb())

  async function post(client: ApiClient, overrides: Record<string, unknown> = {}) {
    const user = await createEnterpriseAdminUser()

    return client
      .post('/clients')
      .form({ ...VALID, ...overrides })
      .loginAs(user)
      .redirects(0)
  }

  test('the reference payload passes the validator and creates the client', async ({
    client,
    assert,
  }) => {
    const response = await post(client)

    assertNoFieldErrors(assert, response)
    assert.lengthOf(await Client.all(), 1)
  })

  test('rejects an empty firstName', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { firstName: '' }), ['firstName'])
  })

  test('rejects an empty lastName', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { lastName: '' }), ['lastName'])
  })

  test('rejects a malformed email', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { email: 'jean.dupont@' }), ['email'])
  })

  test('rejects a status outside the enum', async ({ client, assert }) => {
    // `blacklisted` est le seul statut qui bloque une réservation : une valeur
    // inventée serait stockée et ne bloquerait rien.
    assertFieldErrors(assert, await post(client, { status: 'banned' }), ['status'])
  })

  test('rejects a navigationPermitType outside the shared vocabulary', async ({
    client,
    assert,
  }) => {
    // Vocabulaire partagé avec les certifications d'équipage (#585).
    assertFieldErrors(assert, await post(client, { navigationPermitType: 'submarine_licence' }), [
      'navigationPermitType',
    ])
  })

  test('rejects a firstName longer than 100 characters', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { firstName: 'J'.repeat(101) }), ['firstName'])
  })
})
