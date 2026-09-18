import { test } from '@japa/runner'
import { truncateDb } from '#tests/utils/db'
import { BoatFactory } from '#database/factories/boat_factory'
import { BoatReservationFactory } from '#database/factories/boat_reservation_factory'
import {
  createAdminUser,
  createBoatOwnerUser,
  createCharterAdminUser,
  createMechanicUser,
  createMemberUser,
} from '#tests/functional/helpers'
import BoatReservation from '#models/boat_reservation'
import RentalContract from '#models/rental_contract'
import { domainState, seedDomain } from '#tests/functional/reservations/domain'
import type { DomainContext } from '#tests/functional/reservations/domain'
import { restoreCloudinary, swapFakeCloudinary } from '#tests/support/fakes'
import type { ApiClient, ApiResponse } from '@japa/api-client'
import type User from '#models/user'

/**
 * La frontière des rôles sur le domaine Location, au niveau HTTP (#694).
 *
 * `mechanic` et `boat_owner` n'ont **aucune** capability `reservations.*`,
 * `inspections.*` ni `rentalContracts.*`. Les specs unitaires de #690 le
 * prouvent, mais en instanciant la policy à la main, sans le `before()` de
 * Bouncer et sans la chaîne de middlewares. Au niveau HTTP, ces deux rôles
 * n'apparaissaient dans **aucun** test du domaine : `reservations.spec.ts`,
 * `rental_contracts.spec.ts` et `inspections.spec.ts` n'emploient que
 * `createMemberUser`.
 *
 * ⚠️ L'organisation porte le module Location. Sans lui, le refus observé serait
 * celui de `requireModulePlan`, qui passe **avant** la policy : le test
 * changerait de sujet sans rien dire. Le dernier groupe de ce fichier fige
 * justement la différence entre les deux refus.
 *
 * Ce que la mesure a montré, et qui n'était écrit nulle part : les deux familles
 * de routes ne refusent pas de la même façon.
 *
 * - une **lecture** refusée rend un **403** ;
 * - une **écriture** refusée renvoie un **302 vers `/`** — la page d'accueil
 *   marketing publique — avec le flash `error: 'Access denied'`. Or le layout
 *   marketing ne rend aucun toast : le message n'atteint jamais l'utilisateur,
 *   qui se retrouve éjecté de l'app sans explication. C'est exactement le
 *   défaut corrigé en #456 pour le gating de module, resté entier sur le
 *   chemin des autorisations. **Constaté, pas corrigé.**
 */

const ACCESS_DENIED = 'Access denied'

interface RoleFace {
  name: string
  /** `read` → 403 ; `write` → 302 vers `/` et rien d'écrit. */
  kind: 'read' | 'write'
  call: (client: ApiClient, user: User, ctx: DomainContext) => Promise<ApiResponse>
}

const FACES: RoleFace[] = [
  {
    name: 'la liste des réservations du bateau',
    kind: 'read',
    call: (client, user, { boat }) =>
      client.get(`/boats/${boat.id}/reservations`).loginAs(user).redirects(0),
  },
  {
    name: "l'écran des états des lieux",
    kind: 'read',
    call: (client, user, { boat, reservation }) =>
      client
        .get(`/boats/${boat.id}/reservations/${reservation.id}/inspection`)
        .loginAs(user)
        .redirects(0),
  },
  {
    name: "l'écran du contrat",
    kind: 'read',
    call: (client, user, { boat, reservation }) =>
      client
        .get(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
        .loginAs(user)
        .redirects(0),
  },
  {
    name: 'le PDF du contrat',
    kind: 'read',
    call: (client, user, { boat, reservation }) =>
      client
        .get(`/boats/${boat.id}/reservations/${reservation.id}/contract/pdf`)
        .loginAs(user)
        .redirects(0),
  },
  {
    name: 'créer une réservation',
    kind: 'write',
    call: (client, user, { boat }) =>
      client
        .post(`/boats/${boat.id}/reservations`)
        .form({
          startsAt: '2026-08-01T10:00',
          endsAt: '2026-08-10T10:00',
          clientName: 'Alice Martin',
          clientEmail: 'alice@example.com',
          status: 'option',
        })
        .loginAs(user)
        .redirects(0),
  },
  {
    name: 'supprimer une réservation',
    kind: 'write',
    call: (client, user, { boat, reservation }) =>
      client.delete(`/boats/${boat.id}/reservations/${reservation.id}`).loginAs(user).redirects(0),
  },
  {
    name: 'créer un état des lieux',
    kind: 'write',
    call: (client, user, { boat, reservation }) =>
      client
        .post(`/boats/${boat.id}/reservations/${reservation.id}/inspections`)
        .form({ kind: 'checkin', performedAt: '2026-08-10T10:00', fuelLevel: 50 })
        .loginAs(user)
        .redirects(0),
  },
  {
    name: 'cocher un point de contrôle',
    kind: 'write',
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
    name: "déclarer une action d'équipement",
    kind: 'write',
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
    name: 'ajouter une photo',
    kind: 'write',
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
    name: 'supprimer le contrat',
    kind: 'write',
    call: (client, user, { boat, reservation }) =>
      client
        .delete(`/boats/${boat.id}/reservations/${reservation.id}/contract`)
        .loginAs(user)
        .redirects(0),
  },
]

const REFUSED_ROLES = [
  { role: 'mechanic' as const, create: createMechanicUser },
  { role: 'boat_owner' as const, create: createBoatOwnerUser },
]

for (const { role, create } of REFUSED_ROLES) {
  test.group(`Réservations — un ${role} n'entre pas`, (group) => {
    group.each.setup(() => truncateDb())
    group.each.setup(() => {
      swapFakeCloudinary()
      return () => restoreCloudinary()
    })

    for (const face of FACES) {
      test(`${face.kind === 'read' ? 'ne voit pas' : 'ne peut pas'} ${face.name}`, async ({
        client,
        assert,
      }) => {
        const admin = await createCharterAdminUser()
        const ctx = await seedDomain(admin)
        const user = await create(admin.organizationId!)
        const before = await domainState()

        const response = await face.call(client, user, ctx)

        if (face.kind === 'read') {
          response.assertStatus(403)
        } else {
          response.assertStatus(302)
          // La redirection ne ramène pas à l'écran d'origine mais à l'accueil
          // public, dont le layout ne rend aucun toast : le flash ci-dessous
          // est écrit puis jamais montré (voir l'en-tête de fichier).
          response.assertHeader('location', '/')
          response.assertFlashMessage('error', ACCESS_DENIED)
        }

        assert.deepEqual(
          await domainState(),
          before,
          `un ${role} a modifié la base en tentant « ${face.name} »`
        )
      })
    }
  })
}

test.group('Réservations — le membre, lui, travaille', (group) => {
  group.each.setup(() => truncateDb())

  /**
   * Le contre-exemple sans lequel le fichier ne prouverait rien : si toute
   * écriture était refusée à tout le monde, les groupes ci-dessus passeraient
   * au vert sur une route cassée.
   */

  test('un member crée une réservation et son contrat', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    const boat = await BoatFactory.merge({ organizationId: admin.organizationId! }).create()
    const member = await createMemberUser(admin.organizationId!)

    await client
      .post(`/boats/${boat.id}/reservations`)
      .form({
        startsAt: '2026-08-01T10:00',
        endsAt: '2026-08-10T10:00',
        clientName: 'Alice Martin',
        clientEmail: 'alice@example.com',
        status: 'option',
      })
      .loginAs(member)
      .redirects(0)

    const reservations = await BoatReservation.query().where('boatId', boat.id)
    assert.lengthOf(reservations, 1)

    await client
      .post(`/boats/${boat.id}/reservations/${reservations[0].id}/contract`)
      .loginAs(member)
      .redirects(0)

    assert.lengthOf(await RentalContract.query().where('reservationId', reservations[0].id), 1)
  })

  test('… mais ne supprime pas le contrat, réservé à l’admin', async ({ client, assert }) => {
    const admin = await createCharterAdminUser()
    const ctx = await seedDomain(admin)
    const member = await createMemberUser(admin.organizationId!)

    const response = await client
      .delete(`/boats/${ctx.boat.id}/reservations/${ctx.reservation.id}/contract`)
      .loginAs(member)
      .redirects(0)

    response.assertStatus(302)
    assert.lengthOf(await RentalContract.query().where('id', ctx.contract.id), 1)
  })
})

test.group('Réservations — deux refus qu’il ne faut pas confondre', (group) => {
  group.each.setup(() => truncateDb())

  /**
   * Le rôle et le plan refusent au même endroit, mais pas de la même façon, et
   * la garde de module passe **avant** la policy. Écrire ce test dans une
   * organisation sans le module aurait donc mesuré le module en croyant
   * mesurer le rôle.
   */

  test('le rôle refuse par un 403, le module manquant par une redirection vers la facturation', async ({
    client,
    assert,
  }) => {
    const charterAdmin = await createCharterAdminUser()
    const charterCtx = await seedDomain(charterAdmin)
    const mechanic = await createMechanicUser(charterAdmin.organizationId!)

    const byRole = await client
      .get(`/boats/${charterCtx.boat.id}/reservations`)
      .loginAs(mechanic)
      .redirects(0)

    byRole.assertStatus(403)

    const proAdmin = await createAdminUser()
    const proBoat = await BoatFactory.merge({ organizationId: proAdmin.organizationId! }).create()
    await BoatReservationFactory.merge({
      boatId: proBoat.id,
      organizationId: proBoat.organizationId,
    }).create()

    const byModule = await client
      .get(`/boats/${proBoat.id}/reservations`)
      .loginAs(proAdmin)
      .redirects(0)

    byModule.assertStatus(302)
    byModule.assertHeader('location', '/settings/billing')

    assert.notEqual(byRole.status(), byModule.status())
  })
})
