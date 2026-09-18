import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import {
  createAdminUser,
  createCharterAdminUser,
  createEnterpriseAdminUser,
} from '#tests/functional/helpers'
import BoatReservation from '#models/boat_reservation'
import BoatInspection from '#models/boat_inspection'
import BoatInspectionItem from '#models/boat_inspection_item'
import RentalContract from '#models/rental_contract'
import OrganizationModule from '#models/organization_module'
import { domainState, seedDomain } from '#tests/functional/reservations/domain'
import type { DomainContext } from '#tests/functional/reservations/domain'
import { restoreCloudinary, swapFakeCloudinary } from '#tests/support/fakes'
import type { ApiClient, ApiResponse } from '@japa/api-client'
import type User from '#models/user'

/**
 * La garde du module Location, éprouvée sur ses faces d'écriture (#694).
 *
 * `tests/functional/billing/module_gating.spec.ts` couvre déjà le refus sur
 * quatre **GET d'index**. Aucune route d'écriture du domaine ne l'était : ni la
 * création d'une réservation, ni celle d'un état des lieux, ni l'envoi d'un
 * contrat. Or c'est là que le refus coûte quelque chose — une redirection sur
 * un écran n'écrit rien de toute façon.
 *
 * ⚠️ Deux précautions donnent son sens à ce fichier :
 *
 * 1. **L'acteur est `createAdminUser()`**, admin d'une organisation `pro` avec
 *    membership, et non `createProPlanUser()` qui n'en a pas. Sur une route
 *    gardée par le module *puis* par une policy, un utilisateur sans membership
 *    serait refusé de toute façon : le test resterait vert en ayant changé de
 *    sujet. C'est le piège des gardes en amont (#688).
 * 2. **Chaque refus est asserté avec un témoin** : la base est photographiée
 *    avant et après, et doit être identique. Un test qui n'assert que le
 *    `location` prouve une redirection, pas un refus — la requête pourrait
 *    avoir écrit puis redirigé.
 *
 * Le pendant structurel — *toute* route du domaine porte la garde, y compris
 * celle qu'on ajoutera demain — est dans
 * `tests/unit/hygiene/charter_routes_gated.spec.ts`.
 */

const CHARTER_FLASH =
  'Reservations, inspections and rental contracts are part of the Charter module — ' +
  'included with Enterprise, or available as an add-on on the Pro plan.'

interface GuardedFace {
  name: string
  call: (client: ApiClient, user: User, ctx: DomainContext) => Promise<ApiResponse>
}

const VALID_RESERVATION = {
  startsAt: '2026-08-01T10:00',
  endsAt: '2026-08-10T10:00',
  clientName: 'Alice Martin',
  clientEmail: 'alice@example.com',
  status: 'option',
}

/**
 * Les payloads sont **valides** : un refus obtenu sur un corps invalide ne
 * prouverait pas que c'est la garde qui refuse. Ce sont les mêmes que rejoue le
 * second groupe, module accordé, pour montrer qu'ils aboutissent.
 */
const GUARDED_FACES: GuardedFace[] = [
  {
    name: "GET l'écran des états des lieux",
    call: (client, user, { boat, reservation }) =>
      client
        .get(`/boats/${boat.id}/reservations/${reservation.id}/inspection`)
        .loginAs(user)
        .redirects(0),
  },
  {
    name: "GET l'écran du contrat",
    call: (client, user, { boat, reservation }) =>
      client
        .get(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
        .loginAs(user)
        .redirects(0),
  },
  {
    name: 'POST une réservation',
    call: (client, user, { boat }) =>
      client
        .post(`/boats/${boat.id}/reservations`)
        .form(VALID_RESERVATION)
        .loginAs(user)
        .redirects(0),
  },
  {
    name: 'PATCH une réservation',
    call: (client, user, { boat, reservation }) =>
      client
        .patch(`/boats/${boat.id}/reservations/${reservation.id}`)
        .form({ status: 'cancelled' })
        .loginAs(user)
        .redirects(0),
  },
  {
    name: 'DELETE une réservation',
    call: (client, user, { boat, reservation }) =>
      client.delete(`/boats/${boat.id}/reservations/${reservation.id}`).loginAs(user).redirects(0),
  },
  {
    name: 'POST un état des lieux',
    call: (client, user, { boat, reservation }) =>
      client
        .post(`/boats/${boat.id}/reservations/${reservation.id}/inspections`)
        .form({ kind: 'checkin', performedAt: '2026-08-10T10:00', fuelLevel: 50 })
        .loginAs(user)
        .redirects(0),
  },
  {
    name: 'DELETE un état des lieux',
    call: (client, user, { boat, reservation, inspection }) =>
      client
        .delete(`/boats/${boat.id}/reservations/${reservation.id}/inspections/${inspection.id}`)
        .loginAs(user)
        .redirects(0),
  },
  {
    name: 'PATCH un point de contrôle',
    call: (client, user, { boat, reservation, inspection }) =>
      client
        .patch(
          `/boats/${boat.id}/reservations/${reservation.id}/inspections/${inspection.id}/items`
        )
        .form({ itemKey: 'hull_deck.hull_condition', state: 'ok' })
        .loginAs(user)
        .redirects(0),
  },
  {
    name: "POST une action d'équipement depuis un état des lieux",
    call: (client, user, { boat, reservation, inspection }) =>
      client
        .post(
          `/boats/${boat.id}/reservations/${reservation.id}/inspections/${inspection.id}/equipment-actions`
        )
        .form({ label: 'Remplacer le taud', actionType: 'to_replace' })
        .loginAs(user)
        .redirects(0),
  },
  {
    name: 'POST une photo',
    call: (client, user, { boat, reservation, inspection }) =>
      client
        .post(
          `/boats/${boat.id}/reservations/${reservation.id}/inspections/${inspection.id}/photos`
        )
        .file('files[]', Buffer.from('fake-jpeg'), {
          filename: 'coque.jpg',
          contentType: 'image/jpeg',
        })
        .loginAs(user)
        .redirects(0),
  },
  {
    name: 'POST un contrat',
    call: (client, user, { boat, reservation }) =>
      client
        .post(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
        .loginAs(user)
        .redirects(0),
  },
  {
    name: 'POST envoyer le contrat',
    call: (client, user, { boat, reservation }) =>
      client
        .post(`/boats/${boat.id}/reservations/${reservation.id}/contract/send`)
        .loginAs(user)
        .redirects(0),
  },
  {
    name: 'POST signer le contrat',
    call: (client, user, { boat, reservation }) =>
      client
        .post(`/boats/${boat.id}/reservations/${reservation.id}/contract/sign`)
        .file('file', Buffer.from('%PDF-1.4 signé'), {
          filename: 'contrat-signe.pdf',
          contentType: 'application/pdf',
        })
        .loginAs(user)
        .redirects(0),
  },
  {
    name: 'DELETE le contrat',
    call: (client, user, { boat, reservation }) =>
      client
        .delete(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
        .loginAs(user)
        .redirects(0),
  },
]

test.group('Réservations — sans le module Location, rien ne passe et rien ne s’écrit', (group) => {
  group.each.setup(() => truncateDb())
  // Le fake n'a rien à enregistrer ici : il est là pour qu'une régression de la
  // garde ne parte pas appeler le vrai Cloudinary depuis la CI.
  group.each.setup(() => {
    swapFakeCloudinary()
    return () => restoreCloudinary()
  })

  for (const face of GUARDED_FACES) {
    test(`${face.name} est refusé`, async ({ client, assert }) => {
      const user = await createAdminUser()
      const ctx = await seedDomain(user)
      const before = await domainState()

      const response = await face.call(client, user, ctx)

      response.assertStatus(302)
      response.assertHeader('location', '/settings/billing')
      response.assertFlashMessage('error', CHARTER_FLASH)
      assert.deepEqual(
        await domainState(),
        before,
        `« ${face.name} » a modifié la base alors que la garde l'a refusé`
      )
    })
  }
})

test.group('Réservations — le module accordé ouvre les mêmes écritures', (group) => {
  group.each.setup(() => truncateDb())

  /**
   * Le témoin du groupe précédent : ces payloads aboutissent. Sans lui, un
   * refus systématique dû à un corps mal formé passerait pour du gating.
   */

  test('un pro avec le module Location crée une réservation', async ({ client, assert }) => {
    const user = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .form(VALID_RESERVATION)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    assert.notEqual(response.headers().location, '/settings/billing')
    assert.lengthOf(await BoatReservation.query().where('boatId', boat.id), 1)
  })

  test('… un état des lieux et son point de contrôle', async ({ client, assert }) => {
    const user = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    await client
      .post(`/boats/${boat.id}/reservations/${reservation.id}/inspections`)
      .form({ kind: 'checkin', performedAt: '2026-08-10T10:00', fuelLevel: 50 })
      .loginAs(user)
      .redirects(0)

    const inspections = await BoatInspection.query().where('reservationId', reservation.id)
    assert.lengthOf(inspections, 1)

    await client
      .patch(
        `/boats/${boat.id}/reservations/${reservation.id}/inspections/${inspections[0].id}/items`
      )
      .form({ itemKey: 'hull_deck.hull_condition', state: 'ok' })
      .loginAs(user)
      .redirects(0)

    assert.lengthOf(
      await BoatInspectionItem.query().where('boatInspectionId', inspections[0].id),
      1
    )
  })

  test('… et un contrat de location', async ({ client, assert }) => {
    const user = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()
    const reservation = await BoatReservationFactory.merge({
      boatId: boat.id,
      organizationId: boat.organizationId,
    }).create()

    const response = await client
      .post(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    assert.notEqual(response.headers().location, '/settings/billing')
    assert.lengthOf(await RentalContract.query().where('reservationId', reservation.id), 1)
  })

  test('une organisation enterprise écrit sans aucune ligne dans organization_modules', async ({
    client,
    assert,
  }) => {
    // Le drapeau vient de `PLAN_LIMITS`, pas d'un module accordé : c'est la
    // seconde façon d'ouvrir la Location, et elle ne laisse aucune trace en
    // base.
    const user = await createEnterpriseAdminUser()
    const boat = await BoatFactory.merge({ organizationId: user.organizationId! }).create()

    assert.isEmpty(await OrganizationModule.query().where('organizationId', user.organizationId!))

    const response = await client
      .post(`/boats/${boat.id}/reservations`)
      .form(VALID_RESERVATION)
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    assert.notEqual(response.headers().location, '/settings/billing')
    assert.lengthOf(await BoatReservation.query().where('boatId', boat.id), 1)
  })
})
