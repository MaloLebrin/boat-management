import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { DateTime } from 'luxon'
import { BoatFactory } from '#database/factories/boat_factory'
import { NavigationLogFactory } from '#database/factories/navigation_log_factory'
import { createAdminUser } from '#tests/functional/helpers'
import {
  assertBusinessRuleRejection,
  assertFieldErrors,
  assertNoFieldErrors,
} from '#tests/support/validation'
import NavigationLog from '#models/navigation_log'
import type { ApiClient } from '@japa/api-client'

/**
 * Chemins d'erreur du journal de bord (#688).
 *
 * Deux choses s'y jouent que les autres formulaires n'ont pas :
 *
 * 1. Les dates n'acceptent **que** l'heure (`YYYY-MM-DDTHH:mm`), là où une
 *    réservation accepte aussi une date nue. Une sortie sans heure de départ
 *    n'aurait ni durée ni consommation calculables.
 * 2. Les bornes physiques (force du vent 0–12 Beaufort, heures moteur ≥ 0) sont
 *    des garde-fous de saisie : un `13` au clavier ne doit pas atterrir en base
 *    comme une donnée de sécurité.
 */

const VALID_OPEN = { departedAt: '2026-08-01T10:00' }

test.group('Navigation logs validation (functional)', (group) => {
  group.each.setup(() => truncateDb())

  async function open(client: ApiClient, overrides: Record<string, unknown> = {}) {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    return client
      .post(`/boats/${boat.id}/navigation-logs`)
      .form({ ...VALID_OPEN, ...overrides })
      .loginAs(user)
      .redirects(0)
  }

  async function close(
    client: ApiClient,
    overrides: Record<string, unknown> = {},
    logAttributes: Record<string, unknown> = {}
  ) {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const log = await NavigationLogFactory.merge({
      boatId: boat.id,
      organizationId: user.organizationId!,
      departedAt: DateTime.fromISO('2026-08-01T08:00:00'),
      ...logAttributes,
    }).create()

    return client
      .patch(`/boats/${boat.id}/navigation-logs/${log.id}/close`)
      .form({ arrivedAt: '2026-08-01T14:00', ...overrides })
      .loginAs(user)
      .redirects(0)
  }

  // --- ouverture : le témoin ---

  test('the reference payload opens a trip', async ({ client, assert }) => {
    const response = await open(client)

    assertNoFieldErrors(assert, response)
    assert.lengthOf(await NavigationLog.all(), 1)
  })

  // --- ouverture : contraintes de schéma ---

  test('rejects a missing departedAt', async ({ client, assert }) => {
    const user = await createAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/navigation-logs`)
      .form({})
      .loginAs(user)
      .redirects(0)

    assertFieldErrors(assert, response, ['departedAt'])
  })

  test('rejects a departedAt without a time', async ({ client, assert }) => {
    // `YYYY-MM-DD` est refusé ici alors qu'une réservation l'accepte : une
    // sortie se date à la minute.
    assertFieldErrors(assert, await open(client, { departedAt: '2026-08-01' }), ['departedAt'])
  })

  test('rejects a wind force above 12 Beaufort', async ({ client, assert }) => {
    assertFieldErrors(assert, await open(client, { windForceBeaufort: 13 }), ['windForceBeaufort'])
  })

  test('rejects a seaState outside the enum', async ({ client, assert }) => {
    assertFieldErrors(assert, await open(client, { seaState: 'stormy' }), ['seaState'])
  })

  test('rejects a negative crewCount', async ({ client, assert }) => {
    assertFieldErrors(assert, await open(client, { crewCount: -1 }), ['crewCount'])
  })

  test('rejects negative engine hours at departure', async ({ client, assert }) => {
    assertFieldErrors(assert, await open(client, { engineHoursStart: -5 }), ['engineHoursStart'])
  })

  test('rejects notes longer than 5000 characters', async ({ client, assert }) => {
    assertFieldErrors(assert, await open(client, { notes: 'x'.repeat(5001) }), ['notes'])
  })

  // --- clôture : le témoin, puis le schéma ---

  test('the reference payload closes a trip', async ({ client, assert }) => {
    const response = await close(client)

    assertNoFieldErrors(assert, response)
    const log = await NavigationLog.firstOrFail()
    assert.equal(log.status, 'completed')
  })

  test('rejects a negative distance at arrival', async ({ client, assert }) => {
    assertFieldErrors(assert, await close(client, { distanceNm: -1 }), ['distanceNm'])
  })

  test('rejects a negative fuel consumption', async ({ client, assert }) => {
    assertFieldErrors(assert, await close(client, { fuelConsumedLiters: -3 }), [
      'fuelConsumedLiters',
    ])
  })

  // --- clôture : règles métier, hors du validateur ---

  test('rejects an arrival before the departure as a business rule', async ({ client, assert }) => {
    // Le validateur ne voit qu'`arrivedAt` : la comparaison avec `departedAt`,
    // qui vit en base, appartient au service (`arrivedAtBeforeDeparture`).
    assertBusinessRuleRejection(assert, await close(client, { arrivedAt: '2026-07-31T14:00' }))
  })

  test('rejects decreasing engine hours as a business rule', async ({ client, assert }) => {
    // Même raison : `engineHoursStart` est une valeur déjà enregistrée, pas un
    // champ du formulaire de clôture.
    assertBusinessRuleRejection(
      assert,
      await close(client, { engineHoursEnd: 10 }, { engineHoursStart: '120' })
    )
  })
})
