import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { createCharterAdminUser } from '#tests/functional/helpers'
import {
  assertBusinessRuleRejection,
  assertFieldErrors,
  assertNoFieldErrors,
} from '#tests/support/validation'
import BoatReservation from '#models/boat_reservation'
import type { ApiClient } from '@japa/api-client'

/**
 * Chemins d'erreur de `createBoatReservationValidator` (#688).
 *
 * Le formulaire de réservation est celui qui porte le plus de contraintes du
 * produit : dates, e-mail, énumérations, décimales monétaires. Aucune n'était
 * exercée — seul le chemin passant l'était.
 *
 * Chaque cas part de `VALID` et n'en change **qu'un champ**. C'est ce qui rend
 * l'assertion probante : le premier test prouve que `VALID` franchit le
 * validateur, donc que tout refus qui suit vient de la seule mutation.
 */

const VALID = {
  startsAt: '2026-08-01T10:00',
  endsAt: '2026-08-10T10:00',
  clientName: 'Alice Martin',
  clientEmail: 'alice@example.com',
  status: 'option',
}

function reservationForm(overrides: Record<string, unknown> = {}) {
  return { ...VALID, ...overrides }
}

test.group('Reservations validation (functional)', (group) => {
  group.each.setup(() => truncateDb())

  async function post(client: ApiClient, overrides: Record<string, unknown> = {}) {
    const user = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    return client
      .post(`/boats/${boat.id}/reservations`)
      .form(reservationForm(overrides))
      .loginAs(user)
      .redirects(0)
  }

  // --- le témoin : sans lui, tous les tests suivants pourraient être vacants ---

  test('the reference payload passes the validator and creates the reservation', async ({
    client,
    assert,
  }) => {
    const response = await post(client)

    assertNoFieldErrors(assert, response)
    assert.lengthOf(await BoatReservation.all(), 1)
  })

  // --- contraintes de schéma : erreur sous le champ ---

  test('rejects an empty clientName', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { clientName: '' }), ['clientName'])
  })

  test('rejects a malformed clientEmail', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { clientEmail: 'alice@' }), ['clientEmail'])
  })

  test('rejects a status outside the enum', async ({ client, assert }) => {
    // `pending` n'existe pas : les statuts sont option / confirmed / cancelled.
    assertFieldErrors(assert, await post(client, { status: 'pending' }), ['status'])
  })

  test('rejects a type outside the enum', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { type: 'submarine_tour' }), ['type'])
  })

  test('rejects a negative totalPrice', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { totalPrice: -1 }), ['totalPrice'])
  })

  test('rejects a totalPrice with three decimals', async ({ client, assert }) => {
    // `.decimal([0, 2])` : un prix se stocke au centime, pas au millième.
    assertFieldErrors(assert, await post(client, { totalPrice: '10.999' }), ['totalPrice'])
  })

  test('rejects a date in a format the form never emits', async ({ client, assert }) => {
    // Les deux seuls formats acceptés sont ceux d'un `<input type="datetime-local">`
    // et d'un `<input type="date">` : `YYYY-MM-DDTHH:mm` et `YYYY-MM-DD`.
    assertFieldErrors(assert, await post(client, { startsAt: '31/12/2026' }), ['startsAt'])
  })

  test('rejects notes longer than 2000 characters', async ({ client, assert }) => {
    assertFieldErrors(assert, await post(client, { notes: 'x'.repeat(2001) }), ['notes'])
  })

  test('reports every invalid field at once', async ({ client, assert }) => {
    // Le formulaire affiche toutes les erreurs d'un coup : un validateur qui
    // s'arrêterait à la première obligerait l'utilisateur à autant d'allers-retours.
    assertFieldErrors(assert, await post(client, { clientName: '', clientEmail: 'nope' }), [
      'clientName',
      'clientEmail',
    ])
  })

  // --- règle métier : toast, pas d'erreur de champ ---

  test('rejects endsAt before startsAt as a business rule, not a field error', async ({
    client,
    assert,
  }) => {
    // Le validateur ne connaît pas cette contrainte : elle vit dans
    // `BoatReservationService.create` (`ReservationValidationError`, code
    // `endBeforeStart`) et remonte en flash `error`. L'issue #688 la rangeait
    // avec les contraintes de schéma — elle n'a ni le même point de contrôle
    // ni le même rendu.
    const response = await post(client, { endsAt: '2026-07-01T10:00' })

    assertBusinessRuleRejection(assert, response)
  })
})
