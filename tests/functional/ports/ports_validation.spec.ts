import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { createEnterpriseAdminUser } from '#tests/functional/helpers'
import { assertFieldErrors, assertNoFieldErrors } from '#tests/support/validation'
import Port from '#models/port'
import type { ApiClient } from '@japa/api-client'

/**
 * Chemins d'erreur de `createPortValidator` (#688).
 *
 * La route est gardée trois fois avant le validateur : le plan Entreprise, le
 * profil d'activité (`ports_plan_gating.spec.ts`, `ports_profile_gating.spec.ts`)
 * et la capability `ports.create`. D'où `createEnterpriseAdminUser()` et non
 * `createEnterprisePlanUser()`, qui n'a pas de membership — avec lui, la policy
 * refuse et la requête n'atteint jamais le schéma.
 */

const VALID = { name: 'Port Vauban' }

test.group('Ports validation (functional)', (group) => {
  group.each.setup(() => truncateDb())

  async function post(client: ApiClient, overrides: Record<string, unknown> = {}) {
    const user = await createEnterpriseAdminUser()

    return client
      .post('/ports')
      .form({ ...VALID, ...overrides })
      .loginAs(user)
      .redirects(0)
  }

  test('the reference payload passes the validator and creates the port', async ({
    client,
    assert,
  }) => {
    const response = await post(client)

    assertNoFieldErrors(assert, response)
    assert.lengthOf(await Port.all(), 1)
  })

  test('rejects a name shorter than two characters', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { name: 'P' }), ['name'])
  })

  test('rejects a missing name', async ({ client, assert }) => {
    const user = await createEnterpriseAdminUser()
    const response = await client.post('/ports').form({}).loginAs(user).redirects(0)

    assertFieldErrors(assert, response, ['name'])
  })

  test('rejects an unknown country code', async ({ client, assert }) => {
    // Même liste `COUNTRY_CODES` que le pavillon d'un bateau (#580).
    assertFieldErrors(assert, await post(client, { country: 'XX' }), ['country'])
  })

  test('rejects a city longer than 120 characters', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { city: 'A'.repeat(121) }), ['city'])
  })
})
