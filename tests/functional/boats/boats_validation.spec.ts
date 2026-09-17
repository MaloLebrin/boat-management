import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { createAdminUser } from '#tests/functional/helpers'
import {
  assertBusinessRuleRejection,
  assertFieldErrors,
  assertNoFieldErrors,
} from '#tests/support/validation'
import Boat from '#models/boat'
import type { ApiClient } from '@japa/api-client'

/**
 * Chemins d'erreur de `createBoatValidator` (#688).
 *
 * La fiche coque est le formulaire le plus large du produit (une vingtaine de
 * champs) et le plus dépendant de vocabulaires figés : catégorie CE A–D, type
 * de propulsion, code pays ISO. Élargir l'une de ces énumérations, ou laisser
 * passer un MMSI à 8 chiffres, ne faisait échouer aucun test.
 */

const VALID = { name: 'Sea Breeze' }

test.group('Boats validation (functional)', (group) => {
  group.each.setup(() => truncateDb())

  async function post(client: ApiClient, overrides: Record<string, unknown> = {}) {
    const user = await createAdminUser()

    return client
      .post('/boats')
      .form({ ...VALID, ...overrides })
      .loginAs(user)
      .redirects(0)
  }

  // --- le témoin ---

  test('the reference payload passes the validator and creates the boat', async ({
    client,
    assert,
  }) => {
    const response = await post(client)

    assertNoFieldErrors(assert, response)
    assert.lengthOf(await Boat.all(), 1)
  })

  // --- champ requis ---

  test('rejects a missing name', async ({ client, assert }) => {
    const user = await createAdminUser()
    const response = await client.post('/boats').form({}).loginAs(user).redirects(0)

    assertFieldErrors(assert, response, ['name'])
  })

  test('rejects a name shorter than two characters', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { name: 'A' }), ['name'])
  })

  // --- vocabulaires figés ---

  test('rejects a propulsionType outside the enum', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { propulsionType: 'submarine' }), [
      'propulsionType',
    ])
  })

  test('rejects a navigationCategory outside A-D', async ({ client, assert }) => {
    // Catégorie de conception CE : quatre valeurs, pas une de plus.
    assertFieldErrors(assert, await post(client, { navigationCategory: 'E' }), [
      'navigationCategory',
    ])
  })

  test('rejects an unknown flagCountry', async ({ client, assert }) => {
    // Le pavillon est un code ISO de `COUNTRY_CODES` (#580), pas une chaîne libre.
    assertFieldErrors(assert, await post(client, { flagCountry: 'XX' }), ['flagCountry'])
  })

  test('rejects a hullMaterial outside the enum', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { hullMaterial: 'unobtanium' }), ['hullMaterial'])
  })

  // --- bornes numériques et formats ---

  test('rejects a yearBuilt outside 1800-2200', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { yearBuilt: 1700 }), ['yearBuilt'])
  })

  test('rejects a non-positive lengthM', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { lengthM: 0 }), ['lengthM'])
  })

  test('rejects an MMSI that is not nine digits', async ({ client, assert }) => {
    // Identifiant MMSI : exactement neuf chiffres. Un numéro tronqué rendrait
    // le bateau introuvable en VHF ASN.
    assertFieldErrors(assert, await post(client, { mmsi: '12345678' }), ['mmsi'])
  })

  test('rejects a maxPersons with decimals', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { maxPersons: 4.5 }), ['maxPersons'])
  })

  // --- unicité : contrainte de base, pas contrainte de schéma ---

  test('rejects a registration number already used in the organization', async ({
    client,
    assert,
  }) => {
    // L'unicité n'est pas dans le validateur : c'est l'index
    // `(organization_id, registration_number)` de la table `boats`, rattrapé en
    // 23505 par `BoatHullService` et rendu en toast. L'issue #688 l'attendait
    // comme une erreur de champ — elle n'en est pas une, et le formulaire ne
    // souligne donc pas le champ fautif.
    const user = await createAdminUser()
    await BoatFactory.merge({
      organizationId: user.organizationId!,
      registrationNumber: 'FR-2026-001',
    }).create()

    const response = await client
      .post('/boats')
      .form({ ...VALID, registrationNumber: 'FR-2026-001' })
      .loginAs(user)
      .redirects(0)

    assertBusinessRuleRejection(assert, response)
    assert.lengthOf(await Boat.all(), 1)
  })
})
